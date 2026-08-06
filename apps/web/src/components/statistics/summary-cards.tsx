import { formatMonthLabel, type StatsOverview } from "./types";

export function SummaryCards({ overview }: { overview: StatsOverview }) {
  const habitCount = overview.habitStats.length;
  const activePillars = overview.pillarStats.filter((p) => p.activeHabitCount > 0).length;
  const avgStreak =
    habitCount > 0
      ? Math.round(
          overview.habitStats.reduce((sum, h) => sum + h.bestStreak, 0) / habitCount,
        )
      : 0;

  const cards = [
    { label: "Total completions", value: String(overview.totalCompletions) },
    { label: "Monthly progress", value: `${overview.successRate}%` },
    { label: "Habits tracked", value: String(habitCount) },
    { label: "Avg streak", value: `${avgStreak}d` },
  ];

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-xs font-medium text-foreground/60">Summary</span>
        <span className="text-[10px] text-foreground/60">{formatMonthLabel(overview.year, overview.month)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col gap-1 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <span className="text-xs font-medium text-foreground/60">{card.label}</span>
            <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{card.value}</span>
          </div>
        ))}
        {activePillars === 0 && habitCount === 0 ? (
          <p className="text-sm text-foreground/60">No habits yet — create one to start tracking.</p>
        ) : null}
      </div>
    </div>
  );
}
