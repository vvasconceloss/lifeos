import nodemailer, { type Transporter } from "nodemailer";
import { setDefaultResultOrder } from "node:dns";
import type { EmailConfig } from "./email.config";
import { formatFromAddress } from "./email.config";
import { renderEmail } from "./email.templates";
import type { EmailService, MailTransport, SendEmailInput } from "./email.types";

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 1_000;
// Gmail SMTP answers well within a few seconds. Short timeouts make a failure
// fail fast instead of blocking the request for minutes (the default is 2 min).
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 15_000;

// When EMAIL_PORT is 465 (implicit TLS) some hosts (e.g. free Render instances)
// cannot reach that port but accept 587 (STARTTLS). The service falls back to it
// automatically on a connection-level failure.
const FALLBACK_STARTTLS_PORT = 587;

export interface EmailServiceOptions {
  config: EmailConfig;
  maxAttempts?: number;
  retryDelayMs?: number;
  /** Injectable transport for tests; defaults to an SMTP transport from config. */
  transport?: MailTransport;
  logger?: Pick<Console, "warn" | "error">;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SmtpTransportOptions {
  port?: number;
  secure?: boolean;
}

/** Adapts a nodemailer Transporter to the provider-agnostic MailTransport. */
function nodemailerTransport(transporter: Transporter): MailTransport {
  return {
    sendMail(payload) {
      return transporter.sendMail({
        from: payload.from,
        to: payload.to,
        replyTo: payload.replyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        // Helps transactional mail avoid spam folders: signals the email is a
        // one-way notification and doesn't need a threaded reply.
        headers: {
          "X-Auto-Response-Suppress": "OOF, AutoReply",
          "X-Mailer": "LifeOS",
        },
        // Precedence: bulk de-emphasises promotional/automated mail handling.
        textEncoding: "quoted-printable",
      });
    },
  };
}

function createSmtpTransport(config: EmailConfig, opts: SmtpTransportOptions = {}): MailTransport {
  // Force IPv4 name resolution. On IPv6-capable hosts `smtp.gmail.com` resolves
  // to an IPv6 address first; without an IPv6 route the SMTP connect fails with
  // ENETUNREACH and emails never send (seen on Render free instances).
  setDefaultResultOrder("ipv4first");

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: opts.port ?? config.port,
    secure: opts.secure ?? config.secure,
    auth: config.user
      ? { user: config.user, pass: config.pass }
      : undefined,
    connectionTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    greetingTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    socketTimeout: DEFAULT_SOCKET_TIMEOUT_MS,
  });
  return nodemailerTransport(transporter);
}

/** Connection-level errors that a STARTTLS fallback may fix (network/firewall, not credentials). */
const CONNECTION_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ENETUNREACH",
  "ENETDOWN",
  "EHOSTUNREACH",
  "EHOSTDOWN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ESOCKET",
]);

/** @internal exported for tests */
export function isConnectionError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const code = (error as { code?: string }).code;
    if (code && CONNECTION_ERROR_CODES.has(code)) return true;
    // nodemailer also reports bare "Connection timeout" / "Socket timeout" strings.
    const message = (error as { message?: string }).message ?? "";
    if (/connection timeout|socket timeout|connect/i.test(message)) return true;
  }
  return false;
}

/**
 * Wraps the primary transport with a fallback that retries the send over STARTTLS
 * (port 587, `secure: false`) when the primary connection fails at the network
 * level. Authentication/TLS errors are not retried — they indicate bad config.
 *
 * @internal exported for tests
 */
export function withStartTlsFallback(primary: MailTransport, fallback: MailTransport): MailTransport {
  return {
    async sendMail(payload) {
      try {
        return await primary.sendMail(payload);
      } catch (error) {
        if (!isConnectionError(error)) throw error;
        return fallback.sendMail(payload);
      }
    },
  };
}

/**
 * Provider-independent email service. Sends transactional emails (verify,
 * password reset/change, email change, account deletion) with a simple retry
 * on transient failure and failure logging that never includes the payload data.
 *
 * When `config.enabled` is false (the default, and the case in development),
 * `send` runs in dry-run mode: it renders the email and logs it, but never
 * contacts any SMTP server — safe for local development and tests.
 */
export function createEmailService(options: EmailServiceOptions): EmailService {
  const { config, logger = console } = options;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const transport = options.transport ?? buildTransport(config, logger);

  async function send(input: SendEmailInput): Promise<void> {
    const { to, template, data, locale } = input;
    const rendered = renderEmail(template, data, locale);

    if (!config.enabled) {
      logger.warn(
        `[email][dry-run] would send "${template}" to ${to} (locale ${locale ?? "en"}) — EMAIL_ENABLED is off`,
      );
      return;
    }

    if (!config.fromAddress) {
      throw new Error("Email service is enabled but EMAIL_FROM_ADDRESS is not configured");
    }

    const payload = {
      from: formatFromAddress(config),
      to,
      replyTo: config.replyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await transport.sendMail(payload);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          logger.warn(
            `[email] failed to send "${template}" to ${to} (attempt ${attempt}/${maxAttempts}), retrying…`,
          );
          await sleep(retryDelayMs);
        }
      }
    }

    // Never log the payload (may contain verification/reset links) — only template + recipient.
    logger.error(`[email] sending "${template}" to ${to} failed after ${maxAttempts} attempts`);
    throw lastError;
  }

  return { send };
}

function buildTransport(
  config: EmailConfig,
  logger: Pick<Console, "warn" | "error">,
): MailTransport {
  const primary = createSmtpTransport(config);

  // STARTTLS fallback only makes sense when the configured port is not already
  // the STARTTLS one. 465 (implicit TLS) is the case that needs it on some hosts.
  if (config.port === FALLBACK_STARTTLS_PORT) {
    return primary;
  }

  const fallback = createSmtpTransport(config, {
    port: FALLBACK_STARTTLS_PORT,
    secure: false,
  });

  logger.warn(
    `[email] enabled SMTP STARTTLS fallback (port ${FALLBACK_STARTTLS_PORT}) for ${config.host}`,
  );

  return withStartTlsFallback(primary, fallback);
}
