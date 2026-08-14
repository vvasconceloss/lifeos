import type { EmailTemplate, RenderedEmail } from "./email.types";

const APP_NAME = "LifeOS";

const DEFAULT_LOCALE = "en";

/** Escape a plain string for safe HTML interpolation. */
function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutProps {
  title: string;
  body: string;
}

function baseHtml({ title, body }: LayoutProps): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f7f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
            <tr>
              <td style="background-color:#111827;padding:20px 32px;">
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${APP_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111827;">${escapeHtml(title)}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#6b7280;">
                  You received this email because of activity on your ${APP_NAME} account.
                  If you didn't request this, please ignore it or contact support.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(text)}</p>`;
}

function linkButton(url: string, label: string): string {
  return `<p style="margin:24px 0;">
  <a href="${escapeHtml(url)}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
    ${escapeHtml(label)}
  </a>
</p>`;
}

interface TemplateDef {
  subject: string;
  html: (data: Record<string, unknown>) => string;
  text: (data: Record<string, unknown>) => string;
}

function stringField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function formatDateField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "soon";
}

const TEMPLATES: Record<EmailTemplate, TemplateDef> = {
  "verify-email": {
    subject: "Verify your email — LifeOS",
    html: (data) => {
      const url = stringField(data, "verificationUrl");
      return (
        paragraph("Welcome to LifeOS! Please confirm your email address to activate your account.") +
        linkButton(url, "Verify email") +
        paragraph(`If the button doesn't work, copy this link into your browser: ${url}`)
      );
    },
    text: (data) => {
      const url = stringField(data, "verificationUrl");
      return `Welcome to LifeOS! Please confirm your email address to activate your account.\n\n${url}`;
    },
  },
  "password-reset": {
    subject: "Reset your password — LifeOS",
    html: (data) => {
      const url = stringField(data, "resetUrl");
      return (
        paragraph("We received a request to reset your password. This link is valid for 1 hour.") +
        linkButton(url, "Reset password") +
        paragraph(`If you didn't request this, you can safely ignore this email. Link: ${url}`)
      );
    },
    text: (data) => {
      const url = stringField(data, "resetUrl");
      return `We received a request to reset your password. This link is valid for 1 hour.\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`;
    },
  },
  "password-changed": {
    subject: "Your password was changed — LifeOS",
    html: () =>
      paragraph(
        "Your LifeOS password was successfully changed. If this wasn't you, contact us immediately to secure your account.",
      ),
    text: () =>
      "Your LifeOS password was successfully changed. If this wasn't you, contact us immediately to secure your account.",
  },
  "email-change-request": {
    subject: "Confirm your new email — LifeOS",
    html: (data) => {
      const url = stringField(data, "confirmUrl");
      return (
        paragraph("You requested to change the email on your LifeOS account to this address.") +
        linkButton(url, "Confirm new email") +
        paragraph(`This link is valid for 1 hour. Link: ${url}`)
      );
    },
    text: (data) => {
      const url = stringField(data, "confirmUrl");
      return `You requested to change the email on your LifeOS account to this address.\n\n${url}\n\nThis link is valid for 1 hour.`;
    },
  },
  "email-change-alert": {
    subject: "Email change requested — LifeOS",
    html: (data) => {
      const cancelUrl = stringField(data, "cancelUrl");
      return (
        paragraph(
          "A request was made to change the email address on your LifeOS account to a new address.",
        ) +
        paragraph("If this was you, you can ignore this alert once you confirm the new email.") +
        paragraph("If this wasn't you, cancel the request right away:") +
        linkButton(cancelUrl, "Cancel email change")
      );
    },
    text: (data) => {
      const cancelUrl = stringField(data, "cancelUrl");
      return `A request was made to change the email address on your LifeOS account.\n\nIf this wasn't you, cancel the request right away: ${cancelUrl}`;
    },
  },
  "account-deletion-requested": {
    subject: "Your account will be deleted — LifeOS",
    html: (data) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return (
        paragraph(
          `Your LifeOS account is scheduled for permanent deletion on ${deletionDate}.`,
        ) +
        paragraph("All of your data will be permanently erased after that date.") +
        paragraph("If you change your mind, you can recover your account before then:") +
        linkButton(recoveryUrl, "Keep my account")
      );
    },
    text: (data) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return `Your LifeOS account is scheduled for permanent deletion on ${deletionDate}.\n\nIf you change your mind, recover your account before then: ${recoveryUrl}`;
    },
  },
  "account-deletion-reminder": {
    subject: "Reminder: your account will be deleted soon — LifeOS",
    html: (data) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return (
        paragraph(
          `This is a final reminder that your LifeOS account will be permanently deleted on ${deletionDate}.`,
        ) +
        paragraph("If you want to keep your account, recover it now:") +
        linkButton(recoveryUrl, "Keep my account")
      );
    },
    text: (data) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return `This is a final reminder that your LifeOS account will be permanently deleted on ${deletionDate}.\n\nRecover your account now: ${recoveryUrl}`;
    },
  },
  "account-deleted": {
    subject: "Your account has been deleted — LifeOS",
    html: () =>
      paragraph(
        "Your LifeOS account and all of your data have been permanently deleted. We're sorry to see you go.",
      ),
    text: () =>
      "Your LifeOS account and all of your data have been permanently deleted. We're sorry to see you go.",
  },
};

/**
 * Renders a transactional email for the given template and data, returning a
 * subject, an HTML body (with the shared LifeOS layout) and a plain-text fallback.
 */
export function renderEmail(template: EmailTemplate, data: Record<string, unknown>): RenderedEmail {
  const def = TEMPLATES[template];
  return {
    subject: def.subject,
    html: baseHtml({ title: def.subject, body: def.html(data) }),
    text: def.text(data),
  };
}

export { DEFAULT_LOCALE };
