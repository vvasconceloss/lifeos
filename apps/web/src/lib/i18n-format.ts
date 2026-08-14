import i18n from "@/i18n";

/**
 * Locale-aware date/number formatting helpers. These respect the active i18n
 * language, so dates and percentages render correctly in pt/uk/en.
 */

/** The active locale tag (e.g. "en", "pt", "uk") for Intl APIs. */
export function activeLocale(): string {
  return i18n.language || "en";
}

export function formatLongDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  },
): string {
  return new Intl.DateTimeFormat(activeLocale(), options).format(date);
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat(activeLocale(), {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(activeLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Formats a completion rate/percentage respecting the active locale. */
export function formatPercent(value: number, digits = 0): string {
  return new Intl.NumberFormat(activeLocale(), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Formats an integer/amount respecting the active locale (e.g. XP). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(activeLocale()).format(value);
}
