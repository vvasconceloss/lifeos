import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  applyDocumentLang,
  getStoredLocale,
  isSupportedLocale,
  normalizeLocale,
  setStoredLocale,
  type SupportedLocale,
} from "@/i18n";

/**
 * Locale hook: exposes the active language, a `setLocale` that applies the
 * change instantly (no reload), persists it to localStorage (pre-login) and
 * syncs it to the backend (`PATCH /auth/me`, post-login).
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const { user, refreshUser } = useAuth();

  const setLocale = useCallback(
    async (locale: SupportedLocale) => {
      setStoredLocale(locale);
      await i18n.changeLanguage(locale);
      applyDocumentLang(locale);

      // Sync to the backend when authenticated (persists across devices).
      if (user && user.locale !== locale && !user.isDemo) {
        try {
          await api.patch("/auth/me", { locale });
          await refreshUser();
        } catch {
          // Preference already applied locally; backend sync can retry next time.
        }
      }
    },
    [i18n, user, refreshUser],
  );

  useEffect(() => {
    if (!user || user.isDemo) return;

    // The user's saved preference wins; otherwise adopt the account's locale.
    const stored = getStoredLocale();
    if (stored) {
      if (i18n.language !== stored) {
        i18n.changeLanguage(stored);
        applyDocumentLang(stored);
      }
      return;
    }

    if (isSupportedLocale(user.locale) && i18n.language !== user.locale) {
      i18n.changeLanguage(user.locale);
      applyDocumentLang(user.locale);
    }
  }, [user, i18n]);

  return {
    locale: normalizeLocale(i18n.language),
    setLocale,
  };
}
