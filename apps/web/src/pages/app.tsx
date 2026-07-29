import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { CheckCircle2, Circle, Settings, LogOut } from "lucide-react";

interface Pillar {
  id: string;
  name: string;
}

interface Habit {
  id: string;
  name: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  isActive: boolean;
}

interface Completion {
  habitId: string;
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0] as string;

  useEffect(() => {
    async function fetchData() {
      try {
        const [habitsRes, pillarsRes, compRes] = await Promise.all([
          api.get<{ habits: Habit[] }>("/habits"),
          api.get<{ pillars: Pillar[] }>("/pillars"),
          api.get<{ completions: Completion[] }>(
            `/completions?from=${today}&to=${today}`,
          ),
        ]);
        setHabits(habitsRes.data.habits);
        setPillars(pillarsRes.data.pillars);
        setCompletedIds(
          new Set(compRes.data.completions.map((c) => c.habitId)),
        );
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [today]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeHabits = habits.filter((h) => h.isActive);
  const completedCount = activeHabits.filter((h) => completedIds.has(h.id)).length;
  const progress = activeHabits.length > 0
    ? Math.round((completedCount / activeHabits.length) * 100)
    : 0;

  const habitsByPillar = pillars
    .map((p) => ({
      ...p,
      habits: activeHabits.filter((h) => h.pillarId === p.id),
    }))
    .filter((g) => g.habits.length > 0);

  async function toggleCompletion(habitId: string) {
    const wasCompleted = completedIds.has(habitId);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (wasCompleted) next.delete(habitId);
      else next.add(habitId);
      return next;
    });

    setTogglingId(habitId);
    try {
      if (wasCompleted) {
        await api.delete(`/habits/${habitId}/completions/${today}`);
      } else {
        await api.put(`/habits/${habitId}/completions/${today}`);
      }
    } catch {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.add(habitId);
        else next.delete(habitId);
        return next;
      });
      toast.error("Failed to update");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold text-foreground">LifeOS</h1>
          <div className="relative flex items-center gap-3" ref={menuRef}>
            <span className="text-sm text-foreground/65">{user?.email}</span>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-background py-1 shadow-lg">
                <a
                  href="/settings/pillars"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  Pillars
                </a>
                <a
                  href="/settings/habits"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  Habits
                </a>
                <hr className="my-1 border-border" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg px-4 py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          ) : activeHabits.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="mb-2 text-xl font-semibold text-foreground">
                Welcome to LifeOS
              </h2>
              <p className="mb-6 text-sm text-foreground/65">
                Start by creating your first habit.
              </p>
              <a
                href="/settings/habits"
                className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create habit
              </a>
            </div>
          ) : (
            <>
              {/* Progress section */}
              <section className="mb-8">
                <h2 className="mb-1 text-sm font-medium text-foreground/65">
                  Today&apos;s Progress
                </h2>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {progress}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground/50">
                  {completedCount} of {activeHabits.length} habits done
                </p>
              </section>

              {/* Habits by pillar */}
              <div className="space-y-6">
                {habitsByPillar.map((group) => (
                  <section key={group.id}>
                    <h2 className="mb-2 text-sm font-semibold text-foreground">
                      {group.name}
                    </h2>
                    <ul className="space-y-1">
                      {group.habits.map((habit) => {
                        const isCompleted = completedIds.has(habit.id);
                        return (
                          <li
                            key={habit.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                          >
                            <button
                              onClick={() => toggleCompletion(habit.id)}
                              disabled={togglingId === habit.id}
                              className="shrink-0 rounded-full p-0.5 text-foreground/50 hover:text-primary disabled:opacity-50"
                              aria-label={
                                isCompleted
                                  ? "Unmark as completed"
                                  : "Mark as completed"
                              }
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="size-6 text-primary" />
                              ) : togglingId === habit.id ? (
                                <Spinner />
                              ) : (
                                <Circle className="size-6" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm ${isCompleted
                                  ? "text-foreground/50 line-through"
                                  : "text-foreground"
                                  }`}
                              >
                                {habit.name}
                              </p>
                              {habit.description && (
                                <p className="truncate text-xs text-foreground/50">
                                  {habit.description}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
