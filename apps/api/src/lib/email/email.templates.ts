import type { EmailTemplate, RenderedEmail } from "./email.types";

const APP_NAME = "LifeOS";

const WEB_URL = process.env.WEB_URL ?? "https://lifeos.app";
const SUPPORT_URL = "https://github.com/vvasconceloss/lifeos/issues";
const PRIVACY_URL = `${WEB_URL}/privacy`;

// Brand palette matching the web app (apps/web/src/index.css + auth-layout):
const BRAND_BLUE = "#6366f1"; // indigo-500, the app's accent colour
const FOREGROUND = "#18181b"; // zinc-900, the app's --foreground
const MUTED = "#52525b"; // zinc-600, readable muted text
const FAINT = "#71717a"; // zinc-500, footer legal text
const BORDER = "#e4e4e7"; // zinc-200
const BODY_BG = "#f8f9fa"; // neutral light grey outside the card

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
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BODY_BG};font-family:Arial,Helvetica,sans-serif;color:${FOREGROUND};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BODY_BG};padding:48px 24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid ${BORDER};box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <tr>
              <td align="left" style="padding:48px 48px 0;">
                <span style="display:inline-block;font-size:20px;font-weight:700;color:${FOREGROUND};letter-spacing:0.02em;">${APP_NAME}</span>
              </td>
            </tr>
            <tr>
              <td align="left" style="padding:32px 48px 8px;">
                <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;color:${FOREGROUND};line-height:1.35;">${escapeHtml(title)}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="height:1px;background-color:${BORDER};padding:0;line-height:1px;font-size:1px;">&nbsp;</td>
            </tr>
            <tr>
              <td align="left" style="padding:24px 48px 40px;background-color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${FAINT};">
                  You received this email because of activity on your ${APP_NAME} account.
                  If you didn't request this, you can safely ignore it.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:${FAINT};">
                  <a href="${escapeHtml(PRIVACY_URL)}" style="color:${FAINT};text-decoration:underline;">Privacy Policy</a>
                  &nbsp;·&nbsp;
                  <a href="${escapeHtml(SUPPORT_URL)}" style="color:${FAINT};text-decoration:underline;">Support</a>
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
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${FOREGROUND};">${escapeHtml(text)}</p>`;
}

function linkButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 32px;">
  <tr>
    <td>
      <a href="${escapeHtml(url)}" style="display:inline-block;background-color:${BRAND_BLUE};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:6px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

function fallbackLink(url: string): string {
  const host = safeHost(url);
  return `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED};">
  If the button above doesn't work, paste this link into your browser:<br />
  <a href="${escapeHtml(url)}" style="color:${BRAND_BLUE};text-decoration:underline;word-break:break-all;overflow-wrap:break-word;">${escapeHtml(host)}</a>
</p>`;
}

/** Show only the host for the fallback link, keeping the layout tidy. */
function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
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
    subject: "Confirm your email address",
    html: (data) => {
      const url = stringField(data, "verificationUrl");
      return (
        paragraph("Welcome to LifeOS! Please confirm your email address to activate your account.") +
        linkButton(url, "Confirm email address") +
        fallbackLink(url)
      );
    },
    text: (data) => {
      const url = stringField(data, "verificationUrl");
      return `Welcome to LifeOS! Please confirm your email address to activate your account.\n\n${url}`;
    },
  },
  "password-reset": {
    subject: "Reset your password",
    html: (data) => {
      const url = stringField(data, "resetUrl");
      return (
        paragraph("We received a request to reset your password. This link is valid for 1 hour.") +
        linkButton(url, "Reset password") +
        fallbackLink(url)
      );
    },
    text: (data) => {
      const url = stringField(data, "resetUrl");
      return `We received a request to reset your password. This link is valid for 1 hour.\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`;
    },
  },
  "password-changed": {
    subject: "Your password was changed",
    html: () =>
      paragraph(
        "Your LifeOS password was successfully changed. If this wasn't you, contact us immediately to secure your account.",
      ),
    text: () =>
      "Your LifeOS password was successfully changed. If this wasn't you, contact us immediately to secure your account.",
  },
  "email-change-request": {
    subject: "Confirm your new email",
    html: (data) => {
      const url = stringField(data, "confirmUrl");
      return (
        paragraph("You requested to change the email on your LifeOS account to this address.") +
        linkButton(url, "Confirm new email") +
        fallbackLink(url)
      );
    },
    text: (data) => {
      const url = stringField(data, "confirmUrl");
      return `You requested to change the email on your LifeOS account to this address.\n\n${url}\n\nThis link is valid for 1 hour.`;
    },
  },
  "email-change-alert": {
    subject: "Email change requested",
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
  "email-changed": {
    subject: "Your email was changed",
    html: () =>
      paragraph(
        "The email address on your LifeOS account has been updated. If this wasn't you, contact us immediately to secure your account.",
      ),
    text: () =>
      "The email address on your LifeOS account has been updated. If this wasn't you, contact us immediately to secure your account.",
  },
  "account-deletion-requested": {
    subject: "Your account will be deleted",
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
    subject: "Reminder: your account will be deleted soon",
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
    subject: "Your account has been deleted",
    html: () =>
      paragraph(
        "Your LifeOS account and all of your data have been permanently deleted. We're sorry to see you go.",
      ),
    text: () =>
      "Your LifeOS account and all of your data have been permanently deleted. We're sorry to see you go.",
  },
  "account-recovered": {
    subject: "Your account was recovered",
    html: () =>
      paragraph(
        "Your LifeOS account is back and active. All of your data is intact — welcome back!",
      ),
    text: () =>
      "Your LifeOS account is back and active. All of your data is intact — welcome back!",
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
