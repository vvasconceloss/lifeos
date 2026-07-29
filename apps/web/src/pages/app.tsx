import { toast } from "sonner";
import { api } from "@/lib/api";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/app-layout";
import { CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
}

interface Habit {
  id: string;
  name: string;
  pillarId: string;
  pillarName: string;
  isActive: boolean;
}

interface Completion {
  habitId: string;
  date: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekBounds(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLabel(d: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
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
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : null;
  const todayStr = formatDate(today);

  const baseDate = new Date(today);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const { monday, sunday } = getWeekBounds(baseDate);
  const from = formatDate(monday);
  const to = formatDate(sunday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });

  function isDateDisabled(dateStr: string) {
    if (dateStr > todayStr) return true;
    if (userCreatedAt && dateStr < formatDate(userCreatedAt)) return true;
    return false;
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [habitsRes, pillarsRes, compRes] = await Promise.all([
          api.get<{ habits: Habit[] }>("/habits"),
          api.get<{ pillars: Pillar[] }>("/pillars"),
          api.get<{ completions: Completion[] }>(
            `/completions?from=${from}&to=${to}`,
          ),
        ]);
        setHabits(habitsRes.data.habits);
        setPillars(pillarsRes.data.pillars);
        setCompletions(compRes.data.completions);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [from, to]);

  const activeHabits = habits.filter((h) => h.isActive);
  const visibleCompleted = completions.length;
  const weekTotalDays = activeHabits.length * weekDays.length;
  const isCurrentWeek = weekOffset === 0;
  const todayCompleted = completions.filter(
    (c) => c.habitId && c.date.startsWith(todayStr),
  ).length;
  const progress = isCurrentWeek
    ? (activeHabits.length > 0 ? Math.round((todayCompleted / activeHabits.length) * 100) : 0)
    : (weekTotalDays > 0 ? Math.round((visibleCompleted / weekTotalDays) * 100) : 0);

  const habitsByPillar = pillars
    .map((p) => ({
      ...p,
      habits: activeHabits.filter((h) => h.pillarId === p.id),
    }))
    .filter((g) => g.habits.length > 0);

  function isCompleted(habitId: string, date: string) {
    return completions.some((c) => c.habitId === habitId && c.date.startsWith(date));
  }

  async function toggleCell(habitId: string, date: string) {
    const wasCompleted = isCompleted(habitId, date);
    const cellKey = `${habitId}-${date}`;

    setCompletions((prev) =>
      wasCompleted
        ? prev.filter((c) => !(c.habitId === habitId && c.date.startsWith(date)))
        : [...prev, { habitId, date: `${date}T00:00:00.000Z` }],
    );

    setTogglingId(cellKey);
    try {
      if (wasCompleted) {
        await api.delete(`/habits/${habitId}/completions/${date}`);
      } else {
        await api.put(`/habits/${habitId}/completions/${date}`);
      }
    } catch {
      setCompletions((prev) =>
        wasCompleted
          ? [...prev, { habitId, date: `${date}T00:00:00.000Z` }]
          : prev.filter((c) => !(c.habitId === habitId && c.date.startsWith(date))),
      );
      toast.error("Failed to update");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
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
              <Link
                to="/settings/habits"
                className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create habit
              </Link>
            </div>
          ) : (
            <>
              {/* Week navigation + Today button */}
              <div className="mb-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWeekOffset(weekOffset - 1)}
                    className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  {!isCurrentWeek && (
                    <button
                      onClick={() => setWeekOffset(0)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-foreground/60 hover:text-foreground"
                    >
                      Today
                    </button>
                  )}
                </div>

                <h2 className="text-sm font-semibold text-foreground">
                  {formatLabel(monday)} – {formatLabel(sunday)}
                </h2>

                <button
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
                  aria-label="Next week"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>

              {/* Today's Progress bar (always visible) */}
              <div className="mb-6 rounded-lg border border-border p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/65">
                    {isCurrentWeek ? "Today's Progress" : "Week Progress"}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-foreground/60">
                  {isCurrentWeek
                    ? `${todayCompleted} of ${activeHabits.length} habits done today`
                    : `${visibleCompleted} completions this week`}
                </p>
              </div>

              {/* Weekly table */}
              <div className="overflow-x-auto">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ tableLayout: "auto" }}>
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-foreground/60" />
                        {weekDays.map((d, i) => {
                          const disabled = isDateDisabled(d);
                          return (
                            <th
                              key={d}
                              className={`px-0 py-2 text-center text-xs font-medium ${d === todayStr
                                ? "text-foreground"
                                : disabled
                                  ? "text-foreground/40"
                                  : "text-foreground/65"
                                }`}
                            >
                              {DAYS[i]}
                              <br />
                              <span className="text-[10px]">{d.slice(8)}</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {habitsByPillar.flatMap((group) =>
                        group.habits.map((habit) => (
                          <tr key={habit.id}>
                            <td
                              className={`border-l-[3px] px-3 py-3 text-sm text-foreground ${group.color ? "" : "border-l-transparent"
                                }`}
                              style={group.color ? { borderLeftColor: group.color } : undefined}
                            >
                              <div className="text-sm font-medium text-foreground">{habit.name}</div>
                              <div className="text-[11px] text-foreground/50">{group.name}</div>
                            </td>
                            {weekDays.map((date) => {
                              const done = isCompleted(habit.id, date);
                              const cellKey = `${habit.id}-${date}`;
                              const isToday = date === todayStr;
                              const disabled = isDateDisabled(date);
                              return (
                                <td
                                  key={date}
                                  className={`px-0 text-center align-middle ${isToday && !disabled ? "bg-accent/30" : ""
                                    }`}
                                >
                                  {disabled ? (
                                    <span className="mx-auto flex size-9 items-center justify-center text-foreground/30">
                                      <Square className="size-4" />
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => toggleCell(habit.id, date)}
                                      disabled={togglingId === cellKey}
                                      className="mx-auto flex size-9 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-accent hover:text-primary active:scale-95 disabled:opacity-50"
                                      aria-label={
                                        done
                                          ? `Unmark ${habit.name} for ${date}`
                                          : `Mark ${habit.name} for ${date}`
                                      }
                                    >
                                      {done ? (
                                        <CheckSquare className="size-6 text-primary" />
                                      ) : togglingId === cellKey ? (
                                        <Spinner />
                                      ) : (
                                        <Square className="size-6" />
                                      )}
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
