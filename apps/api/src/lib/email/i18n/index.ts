import i18next, { type i18n as I18n } from "i18next";
import en from "./en.json";
import pt from "./pt.json";
import uk from "./uk.json";

const EMAIL_NAMESPACE = "emails";

const SUPPORTED = ["en", "pt", "uk"] as const;
export type EmailLocale = (typeof SUPPORTED)[number];

export function isEmailLocale(value: string | null | undefined): value is EmailLocale {
  return value !== null && value !== undefined && (SUPPORTED as readonly string[]).includes(value);
}

/** Normalise a locale to a supported one (defaults to "en"). */
export function normalizeEmailLocale(value: string | null | undefined): EmailLocale {
  if (!value) return "en";
  const base = value.toLowerCase().split("-")[0] ?? "";
  return isEmailLocale(base) ? base : "en";
}

export const instance: I18n = i18next.createInstance();

instance.init({
  resources: {
    en: { [EMAIL_NAMESPACE]: en },
    pt: { [EMAIL_NAMESPACE]: pt },
    uk: { [EMAIL_NAMESPACE]: uk },
  },
  ns: [EMAIL_NAMESPACE],
  defaultNS: EMAIL_NAMESPACE,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/** Server-side translation function scoped to the email namespace. */
export function tEmail(locale: EmailLocale, key: string, values?: Record<string, unknown>): string {
  return instance.t(key, { ...values, lng: locale });
}

/** All email keys for a locale — used by tests to assert completeness. */
export function emailKeysFor(locale: EmailLocale): string[] {
  return Object.keys(instance.getResourceBundle(locale, EMAIL_NAMESPACE));
}

export { instance as emailI18n };
