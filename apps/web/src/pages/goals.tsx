import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { Target } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { GoalCard } from "@/components/goals/goal-card";
import { NewGoalModal } from "@/components/goals/new-goal-modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type { Goal } from "@/components/goals/types";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setError(false);
      try {
        const [goalsRes, pillarsRes] = await Promise.all([
          api.get<{ goals: Goal[] }>("/goals"),
          api.get<{ pillars: Pillar[] }>("/pillars"),
        ]);
        setGoals(goalsRes.data.goals);
        setPillars(pillarsRes.data.pillars);
      } catch (e) {
        if (!isUnauthorizedError(e)) setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [reloadKey]);

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  function handleCreated(goal: Goal) {
    setGoals((prev) => [...prev, goal]);
  }

  function handleUpdated(updated: Goal) {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/goals/${id}`);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success("Goal deleted");
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = pillars
    .map((p) => ({ ...p, goals: goals.filter((g) => g.pillarId === p.id) }))
    .filter((g) => g.goals.length > 0);
  const ungrouped = goals.filter((g) => !pillars.some((p) => p.id === g.pillarId));

  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Goals</h2>
            <NewGoalModal pillars={pillars} onCreated={handleCreated} />
          </div>
          {loading ? (
            <div className="flex justify-center py-16 text-foreground/60">
              <Spinner className="size-5" />
            </div>
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : goals.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon={<Target className="size-8" />}
              title="No goals yet"
              description="Define an outcome you want to achieve and link the habits that support it."
              action={<NewGoalModal pillars={pillars} onCreated={handleCreated} />}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col space-y-5">
              {ungrouped.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground/70">Other</h3>
                  <ul className="space-y-2">
                    {ungrouped.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        pillars={pillars}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                        onUpdated={handleUpdated}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {grouped.map((group) => (
                <div key={group.id}>
                  <h3
                    className="mb-2 text-sm font-semibold"
                    style={{
                      borderLeft: group.color ? `3px solid ${group.color}` : undefined,
                      paddingLeft: group.color ? "12px" : undefined,
                      color: group.color ?? undefined,
                    }}
                  >
                    {group.name}
                  </h3>
                  <ul className="space-y-2">
                    {group.goals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        pillars={pillars}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                        onUpdated={handleUpdated}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
