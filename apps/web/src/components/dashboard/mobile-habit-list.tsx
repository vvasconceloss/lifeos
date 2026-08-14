import { CheckSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import { expectedForMonth } from "@/lib/frequency";
import { activeLocale } from "@/lib/i18n-format";
import type { Completion, HabitsGrouped } from "./types";

export function MobileHabitList({
  grouped,
  monthDays,
  todayStr,
  completions,
  togglingId,
  onToggle,
}: {
  grouped: HabitsGrouped;
  monthDays: string[];
  todayStr: string;
  completions: Completion[];
  togglingId: string | null;
  onToggle: (habitId: string, date: string) => void;
}) {
  const { t } = useTranslation("dashboard");

  function isCompleted(habitId: string, date: string) {
    return completions.some((c) => c.habitId === habitId && c.date.startsWith(date));
  }

  const todayLabel = new Intl.DateTimeFormat(activeLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${todayStr}T00:00:00.000Z`));

  const [listYear, listMonth] = (monthDays[0] ?? "2000-01").split("-").map(Number);

  function goalFor(habit: (typeof grouped)[string][number]): number {
    return expectedForMonth(
      habit.frequency,
      habit.daysOfWeek,
      habit.timesPerWeek,
      habit.timesPerMonth,
      listYear,
      listMonth,
    );
  }

  return (
    <div className="flex flex-col gap-5 md:hidden">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
          {t("mobileHabitList.today")}
        </span>
        <span className="text-xs text-foreground/60">{todayLabel}</span>
      </div>

      {Object.entries(grouped).map(([pillarName, habits]) => (
        <div key={pillarName}>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            {pillarName}
          </h3>
          <div className="flex flex-col gap-2">
            {habits.map((habit) => {
              const completed = monthDays.filter((d) => isCompleted(habit.id, d)).length;
              const goal = goalFor(habit);
              const pct = Math.round((completed / goal) * 100);
              const doneToday = isCompleted(habit.id, todayStr);
              const cellKey = `${habit.id}-${todayStr}`;

              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/habits/$id"
                      params={{ id: habit.id }}
                      className="block truncate text-sm font-medium text-foreground hover:underline"
                    >
                      {habit.name}
                    </Link>
                    <p className="text-xs text-foreground/60">
                      {t("mobileHabitList.monthProgress", { completed, goal, pct })}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggle(habit.id, todayStr)}
                    disabled={togglingId === cellKey}
                    aria-label={
                      doneToday
                        ? t("mobileHabitList.unmarkToday", { habit: habit.name })
                        : t("mobileHabitList.markToday", { habit: habit.name })
                    }
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30"
                  >
                    {doneToday ? (
                      <span
                        className="habit-checkbox flex size-7 items-center justify-center rounded-md"
                        style={{ backgroundColor: habit.color }}
                      >
                        <CheckSquare className="size-4.5 text-white" />
                      </span>
                    ) : togglingId === cellKey ? (
                      <Spinner />
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-md border border-foreground/25" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
