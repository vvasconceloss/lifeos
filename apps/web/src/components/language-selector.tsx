import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";
import { LOCALE_NAMES, SUPPORTED_LOCALES } from "@/i18n";

/**
 * Language dropdown for the Profile/Settings page. Applies the change instantly,
 * persists it to localStorage and syncs it to the backend (`User.locale`).
 */
export function LanguageSelector() {
  const { t } = useTranslation("settings");
  const { locale, setLocale } = useLocale();

  return (
    <div className="grid gap-2">
      <label htmlFor="p-language" className="text-xs font-medium text-foreground/60">
        {t("language")}
      </label>
      <Select
        value={locale}
        onValueChange={(value) => {
          const next = SUPPORTED_LOCALES.find((l) => l === value);
          if (next) void setLocale(next);
        }}
      >
        <SelectTrigger id="p-language" className="w-full">
          <SelectValue>{LOCALE_NAMES[locale]}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="w-full">
          {SUPPORTED_LOCALES.map((code) => (
            <SelectItem key={code} value={code}>
              {LOCALE_NAMES[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
