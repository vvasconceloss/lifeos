import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { HabitFrequency } from "@lifeos/shared";

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

const FREQUENCY_OPTION_KEYS: [HabitFrequency, string][] = [
  ["DAILY", "frequency.daily"],
  ["WEEKLY_DAYS", "frequency.weeklyDays"],
  ["TIMES_PER_WEEK", "frequency.timesPerWeek"],
  ["TIMES_PER_MONTH", "frequency.timesPerMonth"],
];

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function FrequencyFields({
  frequency,
  daysOfWeek,
  timesPerWeek,
  timesPerMonth,
  error,
  idPrefix = "freq",
  className,
  onFrequency,
  onDaysOfWeek,
  onTimesPerWeek,
  onTimesPerMonth,
  onTouched,
}: {
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: string;
  timesPerMonth: string;
  error?: string;
  idPrefix?: string;
  className?: string;
  onFrequency: (f: HabitFrequency) => void;
  onDaysOfWeek: (days: number[]) => void;
  onTimesPerWeek: (v: string) => void;
  onTimesPerMonth: (v: string) => void;
  onTouched: () => void;
}) {
  const { t } = useTranslation("habits");

  function toggleDay(day: number) {
    onDaysOfWeek(
      daysOfWeek.includes(day) ? daysOfWeek.filter((d) => d !== day) : [...daysOfWeek, day],
    );
    onTouched();
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-freq`}>{t("frequency.frequency")}</Label>
        <select
          id={`${idPrefix}-freq`}
          value={frequency}
          onChange={(e) => {
            onFrequency(e.target.value as HabitFrequency);
            onTouched();
          }}
          className={inputClass}
        >
          {FREQUENCY_OPTION_KEYS.map(([value, key]) => (
            <option key={value} value={value}>
              {t(key)}
            </option>
          ))}
        </select>
      </div>

      {frequency === "WEEKLY_DAYS" && (
        <div className="grid gap-2 sm:col-span-full">
          <Label>{t("frequency.daysOfWeek")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_KEYS.map((dayKey, value) => {
              const active = daysOfWeek.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground/70 hover:bg-accent",
                  )}
                >
                  {t(`dashboard:daysOfWeek.${dayKey}`)}
                </button>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}

      {frequency === "TIMES_PER_WEEK" && (
        <div className="grid gap-2 sm:col-span-full">
          <Label htmlFor={`${idPrefix}-tpw`}>{t("frequency.timesPerWeekLabel")}</Label>
          <input
            id={`${idPrefix}-tpw`}
            type="number"
            min={1}
            max={7}
            value={timesPerWeek}
            onChange={(e) => {
              onTimesPerWeek(e.target.value);
              onTouched();
            }}
            placeholder={t("frequency.timesPerWeekPlaceholder")}
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}

      {frequency === "TIMES_PER_MONTH" && (
        <div className="grid gap-2 sm:col-span-full">
          <Label htmlFor={`${idPrefix}-tpm`}>{t("frequency.timesPerMonthLabel")}</Label>
          <input
            id={`${idPrefix}-tpm`}
            type="number"
            min={1}
            max={31}
            value={timesPerMonth}
            onChange={(e) => {
              onTimesPerMonth(e.target.value);
              onTouched();
            }}
            placeholder={t("frequency.timesPerMonthPlaceholder")}
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
