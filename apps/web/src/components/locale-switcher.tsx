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
 * Compact language switcher for public surfaces (e.g. the landing footer).
 * Applies the change instantly, persists it to localStorage and syncs it to
 * the backend once the user is authenticated.
 */
export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        const next = SUPPORTED_LOCALES.find((l) => l === value);
        if (next) void setLocale(next);
      }}
    >
      <SelectTrigger className="w-32 gap-1.5" size="sm" aria-label="Language">
        <SelectValue>{LOCALE_NAMES[locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {SUPPORTED_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_NAMES[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
