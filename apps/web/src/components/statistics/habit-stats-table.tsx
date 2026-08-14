import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type HabitStats } from "./types";

export function HabitStatsTable({
  habits,
}: {
  habits: HabitStats[];
}) {
  const { t } = useTranslation("statistics");

  if (habits.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex shrink-0 border-b border-border text-xs font-medium text-foreground/60">
        <div className="flex flex-1 items-center px-3 py-3 text-left">{t("habitsTable.habit")}</div>
        <div className="flex w-28 shrink-0 items-center justify-center py-3">{t("habitsTable.monthRate")}</div>
        <div className="flex w-24 shrink-0 items-center justify-center py-3">{t("habitsTable.streak")}</div>
        <div className="flex w-24 shrink-0 items-center justify-center py-3">{t("habitsTable.best")}</div>
      </div>
      {habits.map((habit) => (
        <div key={habit.habitId} className="flex border-b border-border/20 last:border-0 hover:bg-accent/20">
          <div className="flex flex-1 items-center gap-2 px-3 py-2.5">
            <span className="truncate text-xs text-foreground">{habit.habitName}</span>
          </div>
          <div className="flex w-28 shrink-0 items-center justify-center">
            <div className="h-1.5 w-full max-w-16 overflow-hidden rounded-full bg-border/60">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${habit.completionRate}%` }} />
            </div>
            <span className="ml-2 w-9 shrink-0 text-right font-mono text-xs tabular-nums text-foreground/70">
              {habit.completionRate}%
            </span>
          </div>
          <div className="flex w-24 shrink-0 items-center justify-center gap-1 font-mono text-xs tabular-nums text-foreground">
            <Flame className="size-3.5 text-orange-400" />
            {habit.currentStreak}
          </div>
          <div className="flex w-24 shrink-0 items-center justify-center font-mono text-xs tabular-nums text-foreground/70">
            {habit.bestStreak}
          </div>
        </div>
      ))}
    </div>
  );
}
