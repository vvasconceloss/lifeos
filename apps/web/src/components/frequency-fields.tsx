import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { DAY_ABBREV, FREQUENCY_LABELS } from "@/lib/frequency";
import type { HabitFrequency } from "@lifeos/shared";

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

export function FrequencyFields({
  frequency,
  daysOfWeek,
  timesPerWeek,
  timesPerMonth,
  error,
  idPrefix = "freq",
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
  onFrequency: (f: HabitFrequency) => void;
  onDaysOfWeek: (days: number[]) => void;
  onTimesPerWeek: (v: string) => void;
  onTimesPerMonth: (v: string) => void;
  onTouched: () => void;
}) {
  function toggleDay(day: number) {
    onDaysOfWeek(
      daysOfWeek.includes(day) ? daysOfWeek.filter((d) => d !== day) : [...daysOfWeek, day],
    );
    onTouched();
  }

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-freq`}>Frequency</Label>
        <select
          id={`${idPrefix}-freq`}
          value={frequency}
          onChange={(e) => {
            onFrequency(e.target.value as HabitFrequency);
            onTouched();
          }}
          className={inputClass}
        >
          {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {frequency === "WEEKLY_DAYS" && (
        <div className="grid gap-2">
          <Label>Days of the week</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_ABBREV.map((label, value) => {
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
                  {label}
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
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-tpw`}>Times per week</Label>
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
            placeholder="e.g. 4"
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
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-tpm`}>Times per month</Label>
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
            placeholder="e.g. 12"
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
