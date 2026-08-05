import { CalendarDays, CalendarRange, CalendarCheck2, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { frequencyLabel } from "@/lib/frequency";
import type { HabitFrequency } from "@lifeos/shared";

const FREQUENCY_ICONS: Record<HabitFrequency, typeof CalendarDays> = {
  DAILY: CalendarDays,
  WEEKLY_DAYS: CalendarCheck2,
  TIMES_PER_WEEK: Repeat2,
  TIMES_PER_MONTH: CalendarRange,
};

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
  const Icon = FREQUENCY_ICONS[frequency];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {frequencyLabel(frequency, daysOfWeek, timesPerWeek, timesPerMonth)}
    </span>
  );
}
