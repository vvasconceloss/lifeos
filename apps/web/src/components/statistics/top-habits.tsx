import { formatMonthLabel, type HabitStats } from "./types";

function topBy(items: HabitStats[], key: (h: HabitStats) => number, limit: number): HabitStats[] {
  return [...items].sort((a, b) => key(b) - key(a)).slice(0, limit);
}

export function TopHabits({
  habits,
  year,
  month,
}: {
  habits: HabitStats[];
  year: number;
  month: number;
}) {
  const topRate = topBy(habits, (h) => h.completionRate, 3);
  const topStreak = topBy(habits, (h) => h.bestStreak, 3);

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground/60">Top habits</span>
        <span className="text-[10px] text-foreground/60">{formatMonthLabel(year, month)}</span>
      </div>
      {habits.length === 0 ? (
        <p className="py-4 text-center text-sm text-foreground/60">No data yet.</p>
      ) : (
        <div className="grid flex-1 grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foreground/60">
              Top rate
            </span>
            {topRate.map((habit) => (
              <div key={habit.habitId} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-foreground/80">{habit.habitName}</span>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
                  {habit.completionRate}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foreground/60">
              Longest streak
            </span>
            {topStreak.map((habit) => (
              <div key={habit.habitId} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-foreground/80">{habit.habitName}</span>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
                  {habit.bestStreak}d
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
