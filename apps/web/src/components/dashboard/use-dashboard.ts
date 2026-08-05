import { toast } from "sonner";
import { api } from "@/lib/api";
import { expectedForMonth } from "@/lib/frequency";
import { isUnauthorizedError } from "@/lib/errors";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Completion, Habit, HabitProgress, Pillar, HabitsGrouped } from "./types";

const EMPTY: never[] = [];

export function useDashboard() {
  const [habits, setHabits] = useState<Habit[]>(EMPTY as never);
  const [pillars, setPillars] = useState<Pillar[]>(EMPTY as never);
  const [completions, setCompletions] = useState<Completion[]>(EMPTY as never);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const monthDays = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }), [daysInMonth, year, month]);

  const from = monthDays[0];
  const to = monthDays[monthDays.length - 1];

  useEffect(() => {
    async function fetchAll() {
      setError(false);
      try {
        const [hRes, pRes, cRes] = await Promise.all([
          api.get<{ habits: Habit[] }>("/habits"),
          api.get<{ pillars: Pillar[] }>("/pillars"),
          api.get<{ completions: Completion[] }>(`/completions?from=${from}&to=${to}`),
        ]);
        setHabits(hRes.data.habits);
        setPillars(pRes.data.pillars);
        setCompletions(cRes.data.completions);
      } catch (error) {
        if (!isUnauthorizedError(error)) {
          setError(true);
          toast.error("Failed to load");
        }
      } finally { setInitialLoading(false); }
    }
    fetchAll();
  }, [from, to, year, month, reloadKey]);

  const reload = useCallback(() => {
    setInitialLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const activeHabits = useMemo(() => habits.filter((h) => h.isActive), [habits]);

  const pillarMap = useMemo(() => {
    const m: Record<string, string> = {};
    pillars.forEach((p) => { m[p.id] = p.color ?? "#6b7280"; });
    return m;
  }, [pillars]);

  const habitsWithColor = useMemo(
    () => activeHabits.map((h) => ({
      ...h,
      color: pillarMap[h.pillarId] ?? "#6b7280",
    })),
    [activeHabits, pillarMap],
  );

  const grouped = useMemo(() => {
    const g: HabitsGrouped = {};
    habitsWithColor.forEach((h) => {
      if (!g[h.pillarName]) g[h.pillarName] = [];
      g[h.pillarName].push(h);
    });
    return g;
  }, [habitsWithColor]);

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
      if (wasCompleted) await api.delete(`/habits/${habitId}/completions/${date}`);
      else await api.put(`/habits/${habitId}/completions/${date}`);
    } catch {
      setCompletions((prev) =>
        wasCompleted
          ? [...prev, { habitId, date: `${date}T00:00:00.000Z` }]
          : prev.filter((c) => !(c.habitId === habitId && c.date.startsWith(date))),
      );
    } finally { setTogglingId(null); }
  }

  const chartData = monthDays.map((d) => ({
    day: parseInt(d.split("-")[2]),
    completions: completions.filter((c) => c.date.startsWith(d)).length,
  }));

  const totalCompleted = completions.length;
  const totalPossible = activeHabits.reduce(
    (s, h) => s + expectedForMonth(h.frequency, h.daysOfWeek, h.timesPerWeek, h.timesPerMonth, year, month),
    0,
  );
  const successRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  const habitProgress: HabitProgress[] = activeHabits.map((h) => ({
    habitId: h.id,
    habitName: h.name,
    completed: completions.filter((c) => c.habitId === h.id).length,
    goal: expectedForMonth(h.frequency, h.daysOfWeek, h.timesPerWeek, h.timesPerMonth, year, month),
  }));

  const last7 = chartData.slice(-7);
  const momentumAvg = last7.length > 0 ? Math.round(last7.reduce((s, d) => s + d.completions, 0) / last7.length) : 0;
  const max7 = Math.max(...last7.map((x) => x.completions), 1);

  return {
    habits, pillars, completions, initialLoading, error, reload, togglingId, monthOffset,
    targetDate, year, month, daysInMonth, todayStr, monthDays, activeHabits,
    habitsWithColor, grouped, isCompleted, toggleCell, chartData, totalCompleted,
    totalPossible, successRate, habitProgress, last7, momentumAvg, max7,
    setMonthOffset, setInitialLoading,
  };
}
