/**
 * Email templates supported by the LifeOS EmailService.
 * Each template expects a specific set of `data` fields (see `email.templates.ts`).
 */
export type EmailTemplate =
  | "verify-email"
  | "password-reset"
  | "password-changed"
  | "email-change-request"
  | "email-change-alert"
  | "account-deletion-requested"
  | "account-deletion-reminder"
  | "account-deleted";

export interface SendEmailInput {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  /** ISO 639-1 language code (e.g. "en", "pt", "uk"). Defaults to "en". */
  locale?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Minimal transport contract so the EmailService stays decoupled from the
 * concrete provider. `sendMail` receives a resolved, provider-agnostic payload.
 */
export interface MailTransport {
  sendMail(payload: {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<unknown>;
}

/** The provider-independent email service used by the account lifecycle phases. */
export interface EmailService {
  send(input: SendEmailInput): Promise<void>;
}
