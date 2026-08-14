import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AnalyticsResponse } from "@lifeos/shared";
import { activeLocale } from "@/lib/i18n-format";

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 11,
  padding: "4px 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

function ChartCard({
  title,
  period,
  question,
  children,
}: {
  title: string;
  period: string;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground/60">{title}</span>
        <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[10px] text-foreground/60">{period}</span>
      </div>
      <span className="mb-3 mt-0.5 text-[10px] text-foreground/40">{question}</span>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function TrendBadge({ direction, delta }: { direction: "up" | "down" | "stable"; delta: number }) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3.5" aria-hidden /> +{delta}%
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
        <TrendingDown className="size-3.5" aria-hidden /> {delta}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground/60">
      <Minus className="size-3.5" aria-hidden /> {delta > 0 ? "+" : ""}{delta}%
    </span>
  );
}

function HeadlineCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      <span className="text-[11px] font-medium text-foreground/60">{label}</span>
      <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
      {sub && <span className="text-[10px] text-foreground/60">{sub}</span>}
    </div>
  );
}

function formatRange(from: string, to: string): string {
  const fmt = new Intl.DateTimeFormat(activeLocale(), { month: "short", day: "numeric" });
  const f = fmt.format(new Date(`${from}T00:00:00.000Z`));
  const t = fmt.format(new Date(`${to}T00:00:00.000Z`));
  return `${f} – ${t}`;
}

export function InsightsSection({ analytics }: { analytics: AnalyticsResponse }) {
  const { t } = useTranslation("statistics");
  const latestWeek = analytics.weeklyRates[analytics.weeklyRates.length - 1];
  const pillars = analytics.pillarStats.filter((p) => p.activeHabitCount > 0);
  const needsAttention = pillars.length > 0
    ? [...pillars].sort((a, b) => a.completionRate - b.completionRate)[0]
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground/60">{t("insightsSection.howAmIProgressing")}</span>
        <span className="text-[10px] text-foreground/60">
          {t("insightsSection.lastWeeks", { weeks: analytics.weeks })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HeadlineCard
          label={t("common:thisWeek")}
          value={`${latestWeek?.rate ?? 0}%`}
          sub={latestWeek ? t("insightsSection.thisWeekSub", { completed: latestWeek.completed, expected: latestWeek.expected, range: formatRange(latestWeek.from, latestWeek.to) }) : undefined}
        />
        <HeadlineCard
          label={t("insightsSection.trend")}
          value={<TrendBadge direction={analytics.trend.direction} delta={analytics.trend.delta} />}
          sub={t("insightsSection.trendSub")}
        />
        <HeadlineCard label={t("insightsSection.consistency")} value={`${analytics.consistency}`} sub={t("insightsSection.consistencySub")} />
        <HeadlineCard label={t("insightsSection.dailyAverage")} value={analytics.dailyAverage} sub={t("insightsSection.dailyAverageSub")} />
      </div>

      <ChartCard
        title={t("insightsSection.completionRateOverTime")}
        period={t("insightsSection.last12Weeks")}
        question={t("insightsSection.completionRateQuestion")}
      >
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.weeklyRates} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={30} />
              <ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, t("insightsSection.rate")]} />
              <Line type="monotone" dataKey="rate" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 2.5, fill: "var(--chart-1)" }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title={t("insightsSection.progressionByPillar")}
        period={t("insightsSection.thisMonth")}
        question={t("insightsSection.focusQuestion")}
      >
        {pillars.length === 0 ? (
          <p className="py-10 text-center text-xs text-foreground/60">{t("insightsSection.noHabits")}</p>
        ) : (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pillars} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 8 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="pillarName" width={90} tick={{ fontSize: 10, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, t("insightsSection.rate")]} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                  {pillars.map((p) => (
                    <Cell key={p.pillarId} fill={p.color ?? "var(--chart-1)"} />
                  ))}
                  <LabelList
                    dataKey="completionRate"
                    position="right"
                    formatter={(v) => `${v}%`}
                    fill="var(--foreground)"
                    fontSize={10}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {needsAttention && (
        <p className="rounded-xl border border-border/80 bg-card px-4 py-3 text-xs text-foreground/70">
          <span className="font-semibold text-foreground">{t("insightsSection.focusLabel")}</span>{" "}
          {t("insightsSection.focusText", {
            pillarName: needsAttention.pillarName,
            rate: needsAttention.completionRate,
          })}
        </p>
      )}
    </div>
  );
}
