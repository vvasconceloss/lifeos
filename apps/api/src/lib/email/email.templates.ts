import type { EmailTemplate, RenderedEmail } from "./email.types";
import { tEmail, normalizeEmailLocale, type EmailLocale } from "./i18n";

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
  locale: EmailLocale;
}

function baseHtml({ title, body, locale }: LayoutProps): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
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
                  ${tEmail(locale, "common.receivedBecauseActivity")}
                  ${tEmail(locale, "common.ignoreIfNotRequested")}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:${FAINT};">
                  <a href="${escapeHtml(PRIVACY_URL)}" style="color:${FAINT};text-decoration:underline;">${tEmail(locale, "common.privacyPolicy")}</a>
                  &nbsp;·&nbsp;
                  <a href="${escapeHtml(SUPPORT_URL)}" style="color:${FAINT};text-decoration:underline;">${tEmail(locale, "common.support")}</a>
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

function fallbackLink(url: string, locale: EmailLocale): string {
  const host = safeHost(url);
  return `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED};">
  ${tEmail(locale, "common.linkFallback")}<br />
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
  subject: (locale: EmailLocale) => string;
  html: (data: Record<string, unknown>, locale: EmailLocale) => string;
  text: (data: Record<string, unknown>, locale: EmailLocale) => string;
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
    subject: (locale) => tEmail(locale, "verifyEmail.subject"),
    html: (data, locale) => {
      const url = stringField(data, "verificationUrl");
      return (
        paragraph(tEmail(locale, "verifyEmail.intro")) +
        linkButton(url, tEmail(locale, "common.confirmEmail")) +
        fallbackLink(url, locale)
      );
    },
    text: (data, locale) => {
      const url = stringField(data, "verificationUrl");
      return `${tEmail(locale, "verifyEmail.intro")}\n\n${url}`;
    },
  },
  "password-reset": {
    subject: (locale) => tEmail(locale, "passwordReset.subject"),
    html: (data, locale) => {
      const url = stringField(data, "resetUrl");
      return (
        paragraph(tEmail(locale, "passwordReset.intro")) +
        linkButton(url, tEmail(locale, "common.resetPassword")) +
        fallbackLink(url, locale)
      );
    },
    text: (data, locale) => {
      const url = stringField(data, "resetUrl");
      return `${tEmail(locale, "passwordReset.intro")}\n\n${url}\n\n${tEmail(locale, "passwordReset.ignore")}`;
    },
  },
  "password-changed": {
    subject: (locale) => tEmail(locale, "passwordChanged.subject"),
    html: (_data, locale) => paragraph(tEmail(locale, "passwordChanged.intro")),
    text: (_data, locale) => tEmail(locale, "passwordChanged.intro"),
  },
  "email-change-request": {
    subject: (locale) => tEmail(locale, "emailChangeRequest.subject"),
    html: (data, locale) => {
      const url = stringField(data, "confirmUrl");
      return (
        paragraph(tEmail(locale, "emailChangeRequest.intro")) +
        linkButton(url, tEmail(locale, "common.confirmNewEmail")) +
        fallbackLink(url, locale)
      );
    },
    text: (data, locale) => {
      const url = stringField(data, "confirmUrl");
      return `${tEmail(locale, "emailChangeRequest.intro")}\n\n${url}\n\n${tEmail(locale, "emailChangeRequest.validity")}`;
    },
  },
  "email-change-alert": {
    subject: (locale) => tEmail(locale, "emailChangeAlert.subject"),
    html: (data, locale) => {
      const cancelUrl = stringField(data, "cancelUrl");
      return (
        paragraph(tEmail(locale, "emailChangeAlert.intro")) +
        paragraph(tEmail(locale, "emailChangeAlert.ifYou")) +
        paragraph(tEmail(locale, "emailChangeAlert.ifNotYou")) +
        linkButton(cancelUrl, tEmail(locale, "common.cancelEmailChange"))
      );
    },
    text: (data, locale) => {
      const cancelUrl = stringField(data, "cancelUrl");
      return `${tEmail(locale, "emailChangeAlert.intro")}\n\n${tEmail(locale, "emailChangeAlert.ifNotYou")} ${cancelUrl}`;
    },
  },
  "email-changed": {
    subject: (locale) => tEmail(locale, "emailChanged.subject"),
    html: (_data, locale) => paragraph(tEmail(locale, "emailChanged.intro")),
    text: (_data, locale) => tEmail(locale, "emailChanged.intro"),
  },
  "account-deletion-requested": {
    subject: (locale) => tEmail(locale, "accountDeletionRequested.subject"),
    html: (data, locale) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return (
        paragraph(tEmail(locale, "accountDeletionRequested.scheduledOn", { date: deletionDate })) +
        paragraph(tEmail(locale, "accountDeletionRequested.dataErased")) +
        paragraph(tEmail(locale, "accountDeletionRequested.changeMind")) +
        linkButton(recoveryUrl, tEmail(locale, "common.keepMyAccount"))
      );
    },
    text: (data, locale) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return `${tEmail(locale, "accountDeletionRequested.scheduledOn", { date: deletionDate })}\n\n${tEmail(locale, "accountDeletionRequested.changeMind")} ${recoveryUrl}`;
    },
  },
  "account-deletion-reminder": {
    subject: (locale) => tEmail(locale, "accountDeletionReminder.subject"),
    html: (data, locale) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return (
        paragraph(tEmail(locale, "accountDeletionReminder.finalReminder", { date: deletionDate })) +
        paragraph(tEmail(locale, "accountDeletionReminder.recoverNow")) +
        linkButton(recoveryUrl, tEmail(locale, "common.keepMyAccount"))
      );
    },
    text: (data, locale) => {
      const recoveryUrl = stringField(data, "recoveryUrl");
      const deletionDate = formatDateField(data, "deletionDate");
      return `${tEmail(locale, "accountDeletionReminder.finalReminder", { date: deletionDate })}\n\n${tEmail(locale, "accountDeletionReminder.recoverNow")} ${recoveryUrl}`;
    },
  },
  "account-deleted": {
    subject: (locale) => tEmail(locale, "accountDeleted.subject"),
    html: (_data, locale) => paragraph(tEmail(locale, "accountDeleted.intro")),
    text: (_data, locale) => tEmail(locale, "accountDeleted.intro"),
  },
  "account-recovered": {
    subject: (locale) => tEmail(locale, "accountRecovered.subject"),
    html: (_data, locale) => paragraph(tEmail(locale, "accountRecovered.intro")),
    text: (_data, locale) => tEmail(locale, "accountRecovered.intro"),
  },
};

/**
 * Renders a transactional email for the given template and data, returning a
 * subject, an HTML body (with the shared LifeOS layout) and a plain-text fallback.
 * The `locale` (default "en") selects the translation used for all copy.
 */
export function renderEmail(
  template: EmailTemplate,
  data: Record<string, unknown>,
  localeInput?: string,
): RenderedEmail {
  const locale = normalizeEmailLocale(localeInput);
  const def = TEMPLATES[template];
  const subject = def.subject(locale);
  return {
    subject,
    html: baseHtml({ title: subject, body: def.html(data, locale), locale }),
    text: def.text(data, locale),
  };
}
