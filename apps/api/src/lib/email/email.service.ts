import nodemailer, { type Transporter } from "nodemailer";
import { lookup as dnsLookup, promises as dnsPromises } from "node:dns";
import { isIP } from "node:net";
import type { LookupFunction } from "net";
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

/** @internal exported for tests */
export const ipv4Lookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...(typeof options === "object" ? options : {}), family: 4 }, callback);
};

/** nodemailer 9 accepts `lookup` and forwards it to `net.connect`; @types/nodemailer@8 doesn't type it. */
type SmtpTransportConfig = Parameters<typeof nodemailer.createTransport>[0];

/**
 * Resolves the SMTP host to an IPv4 address. Gmail's `smtp.gmail.com` has both A
 * and AAAA records, and nodemailer 9 resolves them itself and tries IPv6 first —
 * which fails with ENETUNREACH on hosts without an IPv6 route (free Render).
 * Passing the resolved IPv4 as `host` makes nodemailer treat it as a literal IP
 * (`net.isIP`) and skip its own DNS resolution entirely. `servername` keeps the
 * hostname for SNI / TLS certificate validation.
 */
/** @internal exported for tests */
export async function resolveIpv4Host(host: string): Promise<string> {
  if (isIP(host) === 4) return host;
  try {
    const addresses = await dnsPromises.resolve4(host);
    if (addresses.length > 0) return addresses[0]!;
  } catch {
    // Resolution failed — fall back to the hostname and let nodemailer try.
  }
  return host;
}

function createSmtpTransport(
  config: EmailConfig,
  opts: SmtpTransportOptions = {},
  hostOverride?: string,
): MailTransport {
  const host = hostOverride ?? config.host;
  const transporter = nodemailer.createTransport({
    host,
    port: opts.port ?? config.port,
    secure: opts.secure ?? config.secure,
    auth: config.user
      ? { user: config.user, pass: config.pass }
      : undefined,
    // SNI: when `host` is a literal IP, keep the real hostname for TLS.
    servername: host === config.host ? undefined : config.host,
    connectionTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    greetingTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    socketTimeout: DEFAULT_SOCKET_TIMEOUT_MS,
  } as SmtpTransportConfig & { servername?: string });
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
export async function createEmailService(options: EmailServiceOptions): Promise<EmailService> {
  const { config, logger = console } = options;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const transport = options.transport ?? (await buildTransport(config, logger));

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

async function buildTransport(
  config: EmailConfig,
  logger: Pick<Console, "warn" | "error">,
): Promise<MailTransport> {
  const host = await resolveIpv4Host(config.host);
  if (host !== config.host) {
    logger.warn(`[email] resolved ${config.host} to IPv4 ${host} for SMTP`);
  }

  const primary = createSmtpTransport(config, {}, host);

  // STARTTLS fallback only makes sense when the configured port is not already
  // the STARTTLS one. 465 (implicit TLS) is the case that needs it on some hosts.
  if (config.port === FALLBACK_STARTTLS_PORT) {
    return primary;
  }

  const fallback = createSmtpTransport(
    config,
    {
      port: FALLBACK_STARTTLS_PORT,
      secure: false,
    },
    host,
  );

  logger.warn(
    `[email] enabled SMTP STARTTLS fallback (port ${FALLBACK_STARTTLS_PORT}) for ${config.host}`,
  );

  return withStartTlsFallback(primary, fallback);
}
