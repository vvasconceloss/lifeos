import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Line, LineChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { GoalStatusBadge } from "@/components/goals/goal-status-badge";
import { EditGoalDialog } from "@/components/goals/edit-goal-dialog";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import type { Goal, GoalDetail, GoalHabitProgress } from "@/components/goals/types";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
}

interface Habit {
  id: string;
  name: string;
  pillarId: string;
}

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 11,
  padding: "4px 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

export default function GoalDetailPage() {
  const { id } = useParams({ from: "/goals/$id" });
  const { t } = useTranslation("goals");
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState("");
  const [addingHabit, setAddingHabit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [goalRes, pillarsRes, habitsRes] = await Promise.all([
          api.get<{ goal: GoalDetail }>(`/goals/${id}`),
          api.get<{ pillars: Pillar[] }>("/pillars"),
          api.get<{ habits: Habit[] }>("/habits"),
        ]);
        if (cancelled) return;
        setGoal(goalRes.data.goal);
        setPillars(pillarsRes.data.pillars);
        setHabits(habitsRes.data.habits);
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
  }, [id, reloadKey]);

  function retry() {
    setError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  function handleUpdated(updated: Goal) {
    setGoal((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  }

  async function handleAddHabit() {
    if (!selectedHabit || !goal) return;
    setAddingHabit(true);
    try {
      await api.put(`/goals/${goal.id}/habits/${selectedHabit}`);
      setSelectedHabit("");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error(t("toast.addHabitFailed"));
    } finally {
      setAddingHabit(false);
    }
  }

  async function handleRemoveHabit(habitId: string) {
    if (!goal) return;
    try {
      await api.delete(`/goals/${goal.id}/habits/${habitId}`);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error(t("toast.removeHabitFailed"));
    }
  }

  async function handleStatus(status: Goal["status"]) {
    if (!goal) return;
    try {
      const res = await api.patch<{ goal: Goal }>(`/goals/${goal.id}`, { status });
      setGoal((prev) => (prev && prev.id === res.data.goal.id ? { ...prev, ...res.data.goal } : prev));
    } catch {
      toast.error(t("toast.updateStatusFailed"));
    }
  }

  const availableHabits = habits.filter(
    (h) => h.pillarId === goal?.pillarId && !goal?.habits.some((gh: GoalHabitProgress) => gh.habitId === h.id),
  );

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6 lg:overflow-hidden">
          {loading && !goal ? (
            <div className="flex flex-1 items-center justify-center text-foreground/60">
              <Spinner />
            </div>
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : goal ? (
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Link
                  to="/goals"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 text-foreground/60 hover:text-foreground"
                  aria-label={t("goalDetail.backToGoals")}
                >
                  <ArrowLeft className="size-4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{goal.title}</h2>
                  <span className="text-xs text-foreground/60">{goal.pillarName}</span>
                </div>
                <GoalStatusBadge status={goal.status} />
                <EditGoalDialog goal={goal} pillars={pillars} onUpdated={handleUpdated} />
              </div>

              <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_minmax(18rem,24rem)]">
                <div className="flex min-h-0 flex-1 flex-col gap-6">
                  <div className="shrink-0 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-foreground/60">{t("goalDetail.progress")}</span>
                      <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-border/60">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${goal.progress}%`, backgroundColor: goal.pillarColor ?? "var(--chart-1)" }}
                      />
                    </div>
                    <div className="mt-3 text-xs text-foreground/60">
                      {t("goalDetail.habitCount", { count: goal.habits.length })}
                    </div>
                    {goal.description && (
                      <div className="mt-4 border-t border-border/40 pt-4">
                        <span className="text-xs font-medium text-foreground/60">{t("goalDetail.description")}</span>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/70">
                          {goal.description}
                        </p>
                      </div>
                    )}
                    {goal.status !== "ACTIVE" && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-4">
                        {(["ACTIVE", "COMPLETED", "ABANDONED"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatus(s)}
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                              goal.status === s
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent text-foreground/70 hover:bg-accent/70"
                            }`}
                          >
                            {t(`status.${s.toLowerCase()}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="min-h-0 flex-1 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-xs font-medium text-foreground/60">{t("goalDetail.progressOverTime")}</span>
                      <span className="text-[10px] text-foreground/40">{t("goalDetail.last8Weeks")}</span>
                    </div>
                    <div className="h-full min-h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={goal.progressHistory} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={30} />
                          <ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, t("goalDetail.progress")]} />
                          <Line type="monotone" dataKey="progress" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 2.5, fill: "var(--chart-1)" }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <span className="mb-3 shrink-0 text-xs font-medium text-foreground/60">{t("goalDetail.supportingHabits")}</span>
                  {goal.habits.length === 0 ? (
                    <p className="py-4 text-center text-xs text-foreground/60">
                      {t("goalDetail.noHabitsLinked")}
                    </p>
                  ) : (
                    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto scroll-subtle">
                      {goal.habits.map((h) => (
                        <li key={h.habitId} className="flex items-center gap-3 rounded-xl border border-border/80 bg-background px-4 py-2.5">
                          <Link
                            to="/habits/$id"
                            params={{ id: h.habitId }}
                            className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline"
                          >
                            {h.habitName}
                          </Link>
                          <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-border/60">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${h.rate}%` }} />
                          </div>
                          <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-foreground/70">
                            {h.rate}%
                          </span>
                          <button
                            onClick={() => handleRemoveHabit(h.habitId)}
                            className="shrink-0 rounded-md p-1 text-foreground/40 hover:text-destructive"
                            aria-label={t("goalDetail.removeHabit", { name: h.habitName })}
                          >
                            <X className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {availableHabits.length > 0 && (
                    <div className="mt-4 flex shrink-0 items-center gap-2 border-t border-border/40 pt-3">
                      <select
                        value={selectedHabit}
                        onChange={(e) => setSelectedHabit(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">{t("goalDetail.addHabitPlaceholder")}</option>
                        {availableHabits.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddHabit}
                        disabled={!selectedHabit || addingHabit}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {addingHabit ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                        {t("common:add")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
