export interface EmailConfig {
  /** When false, `EmailService` runs in dry-run mode and never sends real emails. */
  enabled: boolean;
  host: string;
  port: number;
  /** true → TLS on connection (Gmail SMTP over 465). */
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromAddress: string;
  replyTo: string;
}

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readEnv(env: NodeJS.ProcessEnv): EmailConfig {
  return {
    enabled: boolFromEnv(env.EMAIL_ENABLED, false),
    host: env.EMAIL_HOST ?? "smtp.gmail.com",
    port: Number(env.EMAIL_PORT ?? 465),
    secure: boolFromEnv(env.EMAIL_SECURE, true),
    user: env.EMAIL_USER ?? "",
    pass: env.EMAIL_PASS ?? "",
    fromName: env.EMAIL_FROM_NAME ?? "LifeOS",
    fromAddress: env.EMAIL_FROM_ADDRESS ?? env.EMAIL_USER ?? "",
    replyTo: env.EMAIL_REPLY_TO ?? env.EMAIL_USER ?? "",
  };
}

/** Builds the email config from environment variables (defaults to dry-run). */
export function loadEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig {
  return readEnv(env);
}

/** Returns the From header value (e.g. `"LifeOS" <noreply@...>`). */
export function formatFromAddress(config: EmailConfig): string {
  return `${config.fromName} <${config.fromAddress}>`;
}
