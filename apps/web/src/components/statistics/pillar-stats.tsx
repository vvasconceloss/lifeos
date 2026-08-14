import { useTranslation } from "react-i18next";
import type { PillarStats } from "./types";

export function PillarStats({
  pillars,
  monthLabel,
}: {
  pillars: PillarStats[];
  monthLabel: string;
}) {
  const { t } = useTranslation("statistics");
  const withHabits = pillars.filter((p) => p.activeHabitCount > 0);

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground/60">{t("pillarStats.byPillar")}</span>
        <span className="text-[10px] text-foreground/60">{monthLabel}</span>
      </div>
      {withHabits.length === 0 ? (
        <p className="py-4 text-center text-sm text-foreground/60">{t("pillarStats.noData")}</p>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-3">
          {withHabits.map((pillar) => (
            <div key={pillar.pillarId} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: pillar.color ?? "#6b7280" }}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-foreground/80">{pillar.pillarName}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-foreground/60">
                    {pillar.completed}/{pillar.total}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pillar.completionRate}%`,
                      backgroundColor: pillar.color ?? "#6b7280",
                    }}
                  />
                </div>
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                {pillar.completionRate}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
