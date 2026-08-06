import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      toast.error("Failed to add habit");
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
      toast.error("Failed to remove habit");
    }
  }

  async function handleStatus(status: Goal["status"]) {
    if (!goal) return;
    try {
      const res = await api.patch<{ goal: Goal }>(`/goals/${goal.id}`, { status });
      setGoal((prev) => (prev && prev.id === res.data.goal.id ? { ...prev, ...res.data.goal } : prev));
    } catch {
      toast.error("Failed to update status");
    }
  }

  const availableHabits = habits.filter(
    (h) => h.pillarId === goal?.pillarId && !goal?.habits.some((gh: GoalHabitProgress) => gh.habitId === h.id),
  );

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6">
          {loading && !goal ? (
            <div className="flex flex-1 items-center justify-center text-foreground/50">
              <Spinner />
            </div>
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : goal ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <Link
                  to="/goals"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 text-foreground/60 hover:text-foreground"
                  aria-label="Back to goals"
                >
                  <ArrowLeft className="size-4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{goal.title}</h2>
                  <span className="text-xs text-foreground/50">{goal.pillarName}</span>
                </div>
                <GoalStatusBadge status={goal.status} />
                <EditGoalDialog goal={goal} pillars={pillars} onUpdated={handleUpdated} />
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-foreground/60">Progress</span>
                  <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {goal.progress}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${goal.progress}%`, backgroundColor: goal.pillarColor ?? "var(--chart-1)" }}
                  />
                </div>
                {goal.status !== "ACTIVE" && (
                  <div className="mt-3 flex gap-2">
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
                        {s.toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-foreground/60">Progress over time</span>
                  <span className="text-[10px] text-foreground/40">last 8 weeks</span>
                </div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={goal.progressHistory} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={30} />
                      <ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Progress"]} />
                      <Line type="monotone" dataKey="progress" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 2.5, fill: "var(--chart-1)" }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <span className="mb-3 block text-xs font-medium text-foreground/60">Supporting habits</span>
                {goal.habits.length === 0 ? (
                  <p className="py-4 text-center text-xs text-foreground/45">
                    No habits linked yet. Add a habit below to start tracking progress.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {goal.habits.map((h) => (
                      <li key={h.habitId} className="flex items-center gap-3">
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
                          aria-label={`Remove ${h.habitName}`}
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {availableHabits.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3">
                    <select
                      value={selectedHabit}
                      onChange={(e) => setSelectedHabit(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Add a habit…</option>
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
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
