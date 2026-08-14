import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LOCALES = ["en", "pt", "uk"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  pt: "Português",
  uk: "Українська",
};

export const LOCALE_STORAGE_KEY = "lifeos.locale";

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value !== null && value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Normalise a browser locale (e.g. "pt-PT" → "pt", "en-US" → "en") to a supported one. */
export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) return "en";
  const base = value.toLowerCase().split("-")[0] ?? "";
  return isSupportedLocale(base) ? base : "en";
}

export function getStoredLocale(): SupportedLocale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function setStoredLocale(locale: SupportedLocale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage unavailable (private mode) — preference just won't persist locally.
  }
}

/**
 * Namespaces are resolved at build time from `./locales/<lang>/<ns>.json`.
 * This keeps the key-completeness CI script and the app in sync: a new
 * namespace only needs its three JSON files to be added to the folders.
 */
export const resources: Record<string, Record<string, Record<string, unknown>>> = {};

const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  "./locales/*/*.json",
  { eager: true },
);

for (const [path, mod] of Object.entries(localeModules)) {
  // path looks like ./locales/en/auth.json
  const segments = path.split("/");
  const lang = segments[segments.length - 2];
  const namespace = segments[segments.length - 1].replace(/\.json$/, "");
  if (!lang || !namespace) continue;
  resources[lang] ??= {};
  resources[lang][namespace] = mod.default;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: Object.keys(resources.en),
    defaultNS: "common",
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES,
    // The manual choice (localStorage) must win over automatic detection.
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    returnNull: false,
  });

/** Applies the active locale to the document (used by tests and app code). */
export function applyDocumentLang(locale: SupportedLocale): void {
  document.documentElement.setAttribute("lang", locale);
}

/**
 * Whenever the active language changes — whether from automatic detection or a
 * manual choice — keep the document `lang` attribute in sync (a11y/SEO) and
 * persist the choice locally so it wins over detection on the next visit.
 */
i18n.on("languageChanged", (lng: string) => {
  if (isSupportedLocale(lng)) {
    applyDocumentLang(lng);
    setStoredLocale(lng);
  }
});

applyDocumentLang((i18n.language as SupportedLocale) || "en");

export default i18n;
