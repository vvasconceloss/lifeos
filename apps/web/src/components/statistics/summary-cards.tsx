import { useTranslation } from "react-i18next";
import { formatMonthLabel, type StatsOverview } from "./types";
import { formatNumber } from "@/lib/i18n-format";

export function SummaryCards({ overview }: { overview: StatsOverview }) {
  const { t } = useTranslation("statistics");
  const habitCount = overview.habitStats.length;
  const activePillars = overview.pillarStats.filter((p) => p.activeHabitCount > 0).length;
  const avgStreak =
    habitCount > 0
      ? Math.round(
          overview.habitStats.reduce((sum, h) => sum + h.bestStreak, 0) / habitCount,
        )
      : 0;

  const cards = [
    { label: t("summaryCards.totalCompletions"), value: formatNumber(overview.totalCompletions) },
    { label: t("summaryCards.monthlyProgress"), value: `${formatNumber(overview.successRate)}%` },
    { label: t("summaryCards.habitsTracked"), value: formatNumber(habitCount) },
    { label: t("summaryCards.avgStreak"), value: `${formatNumber(avgStreak)}d` },
  ];

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-xs font-medium text-foreground/60">{t("summaryCards.summary")}</span>
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
          <p className="text-sm text-foreground/60">{t("summaryCards.empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
