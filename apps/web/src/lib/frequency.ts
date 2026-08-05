import type { HabitFrequency } from "@lifeos/shared";

export const DAY_ABBREV = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  DAILY: "Every day",
  WEEKLY_DAYS: "Specific days of the week",
  TIMES_PER_WEEK: "X times per week",
  TIMES_PER_MONTH: "X times per month",
};

export function frequencyLabel(
  frequency: HabitFrequency,
  daysOfWeek: number[],
  timesPerWeek: number | null,
  timesPerMonth: number | null,
): string {
  switch (frequency) {
    case "DAILY":
      return "Every day";
    case "WEEKLY_DAYS":
      return daysOfWeek
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_ABBREV[d] ?? d)
        .join(" · ");
    case "TIMES_PER_WEEK":
      return `${timesPerWeek ?? "—"}× / week`;
    case "TIMES_PER_MONTH":
      return `${timesPerMonth ?? "—"}× / month`;
  }
}

export function expectedForMonth(
  frequency: HabitFrequency,
  daysOfWeek: number[],
  timesPerWeek: number | null,
  timesPerMonth: number | null,
  year: number,
  month: number,
): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  switch (frequency) {
    case "DAILY":
      return daysInMonth;
    case "WEEKLY_DAYS": {
      let count = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const weekday = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
        if (daysOfWeek.includes(weekday)) count++;
      }
      return count;
    }
    case "TIMES_PER_WEEK":
      return Math.round(((timesPerWeek ?? 1) * daysInMonth) / 7);
    case "TIMES_PER_MONTH":
      return timesPerMonth ?? daysInMonth;
  }
}
