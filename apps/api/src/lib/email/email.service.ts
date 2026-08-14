import nodemailer, { type Transporter } from "nodemailer";
import type { EmailConfig } from "./email.config";
import { formatFromAddress } from "./email.config";
import { renderEmail } from "./email.templates";
import type { EmailService, MailTransport, SendEmailInput } from "./email.types";

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 1_000;

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
      });
    },
  };
}

function createSmtpTransport(config: EmailConfig): MailTransport {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user
      ? { user: config.user, pass: config.pass }
      : undefined,
  });
  return nodemailerTransport(transporter);
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
  const transport = options.transport ?? createSmtpTransport(config);

  async function send(input: SendEmailInput): Promise<void> {
    const { to, template, data, locale } = input;
    const rendered = renderEmail(template, data);

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
