import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { ArrowLeft, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { HabitHistory, HabitHistoryDay } from "@lifeos/shared";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { MonthNavigation } from "@/components/dashboard/month-navigation";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthCells(days: HabitHistoryDay[]): (HabitHistoryDay | null)[] {
  if (days.length === 0) return [];
  const offset = (days[0]!.weekday + 6) % 7;
  const cells: (HabitHistoryDay | null)[] = Array<null>(offset).fill(null);
  cells.push(...days);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      <span className="text-[11px] font-medium text-foreground/60">{label}</span>
      <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">{value}</span>
      {sub && <span className="text-[10px] text-foreground/50">{sub}</span>}
    </div>
  );
}

export default function HabitDetailPage() {
  const { id } = useParams({ from: "/habits/$id" });
  const [history, setHistory] = useState<HabitHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const targetDate = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + monthOffset, 1));
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(false);
      try {
        const res = await api.get<{ history: HabitHistory }>(
          `/habits/${id}/history?from=${from}&to=${to}`,
        );
        if (!cancelled) setHistory(res.data.history);
      } catch (e) {
        if (!cancelled && !isUnauthorizedError(e)) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, from, to, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const cells = history ? buildMonthCells(history.days) : [];
  const todayKey = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}-${String(new Date().getUTCDate()).padStart(2, "0")}`;

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-hidden px-6 py-6">
          {loading && !history ? (
            <div className="flex flex-1 items-center justify-center text-foreground/50">
              <Spinner />
            </div>
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : history ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    to="/settings/habits"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 text-foreground/60 hover:text-foreground"
                    aria-label="Back to habits"
                  >
                    <ArrowLeft className="size-4" />
                  </Link>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
                      {history.habitName}
                    </h2>
                  </div>
                </div>
                <MonthNavigation
                  monthOffset={monthOffset}
                  label={targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  onPrev={() => setMonthOffset(monthOffset - 1)}
                  onNext={() => setMonthOffset(monthOffset + 1)}
                  onToday={() => setMonthOffset(0)}
                />
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard
                  label="Completion rate"
                  value={`${history.completionRate}%`}
                  sub={`${history.actual} / ${history.expected} expected`}
                />
                <SummaryCard label="Current streak" value={`${history.currentStreak}`} />
                <SummaryCard label="Best streak" value={`${history.bestStreak}`} />
                <div className="flex flex-col justify-center gap-0.5 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm">
                  <span className="text-[11px] font-medium text-foreground/60">vs. previous period</span>
                  <span className="flex items-center gap-1 text-xl font-bold tracking-tight tabular-nums">
                    {history.comparison.delta > 0 && <ArrowUpRight className="size-5 text-emerald-500" aria-hidden />}
                    {history.comparison.delta < 0 && <ArrowDownRight className="size-5 text-destructive" aria-hidden />}
                    <span className="text-foreground">{history.comparison.delta > 0 ? "+" : ""}{history.comparison.delta}%</span>
                  </span>
                  <span className="text-[10px] text-foreground/50">
                    {history.comparison.current}% now · {history.comparison.previous}% before
                  </span>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                <span className="mb-2 shrink-0 text-xs font-medium text-foreground/60">Monthly calendar</span>
                <div className="grid shrink-0 grid-cols-7 gap-1.5 text-[10px] font-medium text-foreground/40">
                  {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className="text-center">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] gap-1.5">
                  {cells.map((cell, i) =>
                    cell ? (
                      <div
                        key={cell.date}
                        className={`flex items-center justify-center rounded-md text-xs tabular-nums ${
                          cell.completed
                            ? "bg-emerald-500 text-white"
                            : cell.scheduled
                              ? cell.date > todayKey
                                ? "bg-border/40 text-foreground/40"
                                : "border border-destructive/40 text-foreground/60"
                              : "text-foreground/25"
                        }`}
                        role="img"
                        aria-label={`${cell.date}: ${cell.completed ? "completed" : cell.scheduled ? "scheduled, not completed" : "not scheduled"}`}
                      >
                        {parseInt(cell.date.split("-")[2]!, 10)}
                      </div>
                    ) : (
                      <div key={`empty-${i}`} />
                    ),
                  )}
                </div>
                <div className="mt-3 flex shrink-0 flex-wrap gap-4 text-[10px] text-foreground/50">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-emerald-500" /> Completed</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] border border-destructive/40" /> Scheduled, missed</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-border/40" /> Scheduled, future</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] border border-border/40" /> Not scheduled</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
