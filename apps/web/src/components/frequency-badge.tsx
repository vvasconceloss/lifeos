import { CalendarDays, CalendarRange, CalendarCheck2, Repeat2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { HabitFrequency } from "@lifeos/shared";

const FREQUENCY_ICONS: Record<HabitFrequency, typeof CalendarDays> = {
  DAILY: CalendarDays,
  WEEKLY_DAYS: CalendarCheck2,
  TIMES_PER_WEEK: Repeat2,
  TIMES_PER_MONTH: CalendarRange,
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function FrequencyBadge({
  frequency,
  daysOfWeek,
  timesPerWeek,
  timesPerMonth,
  className,
}: {
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
  className?: string;
}) {
  const { t } = useTranslation("habits");
  const Icon = FREQUENCY_ICONS[frequency];

  let label: string;
  switch (frequency) {
    case "DAILY":
      label = t("frequency.daily");
      break;
    case "WEEKLY_DAYS":
      label = daysOfWeek
        .slice()
        .sort((a, b) => a - b)
        .map((d) => (DAY_KEYS[d] ? t(`dashboard:daysOfWeek.${DAY_KEYS[d]}`) : String(d)))
        .join(" · ");
      break;
    case "TIMES_PER_WEEK":
      label = t("frequency.perWeek", { count: timesPerWeek ?? "—" });
      break;
    case "TIMES_PER_MONTH":
      label = t("frequency.perMonth", { count: timesPerMonth ?? "—" });
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
