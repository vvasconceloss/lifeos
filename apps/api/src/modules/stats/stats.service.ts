import { prisma } from "../../db/client";
import type { AnalyticsResponse, HabitFrequency, HabitStats, HeatmapResponse, MonthlyStats, PillarStats, StatsOverview } from "./stats.schemas";
import {
  addDays,
  buildDailyKeySet,
  buildHeatmapDays,
  getDaysInMonth,
  getMonthRange,
  getMonthReference,
  getYearRange,
  toDateKey,
} from "./stats.utils";
import {
  completionRate,
  expectedCompletions,
  getBestStreakForFrequency,
  getCurrentStreakForFrequency,
  type FrequencyParams,
} from "../../lib/frequency";

function frequencyParams(habit: {
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
}): FrequencyParams {
  return {
    frequency: habit.frequency,
    daysOfWeek: habit.daysOfWeek,
    timesPerWeek: habit.timesPerWeek,
    timesPerMonth: habit.timesPerMonth,
  };
}

function computeHabitStats(
  habit: {
    id: string;
    name: string;
    frequency: HabitFrequency;
    daysOfWeek: number[];
    timesPerWeek: number | null;
    timesPerMonth: number | null;
  },
  dates: Date[],
  year: number,
  month: number,
): HabitStats {
  const reference = getMonthReference(year, month);
  const freq = frequencyParams(habit);
  const { from, to } = getMonthRange(year, month);
  const allKeys = buildDailyKeySet(dates, reference);
  const monthKeys = buildDailyKeySet(dates.filter((d) => d >= from && d <= to), reference);

  return {
    habitId: habit.id,
    habitName: habit.name,
    completionRate: completionRate(monthKeys.size, expectedCompletions(freq, from, to)),
    currentStreak: getCurrentStreakForFrequency(freq, allKeys, reference),
    bestStreak: getBestStreakForFrequency(freq, monthKeys),
  };
}

export async function getHabitStats(
  habitId: string,
  userId: string,
  year: number,
  month: number,
): Promise<HabitStats | null> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) return null;

  const completions = await prisma.habitCompletion.findMany({
    where: { habitId },
    select: { date: true },
  });

  return computeHabitStats(
    {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency as HabitFrequency,
      daysOfWeek: habit.daysOfWeek,
      timesPerWeek: habit.timesPerWeek,
      timesPerMonth: habit.timesPerMonth,
    },
    completions.map((c) => c.date),
    year,
    month,
  );
}

async function getHabitStatsList(
  userId: string,
  year: number,
  month: number,
): Promise<HabitStats[]> {
  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const habitIds = habits.map((h) => h.id);
  if (habitIds.length === 0) return [];

  const completions = await prisma.habitCompletion.findMany({
    where: { habitId: { in: habitIds } },
    select: { habitId: true, date: true },
  });

  const datesByHabit = new Map<string, Date[]>();
  for (const completion of completions) {
    const dates = datesByHabit.get(completion.habitId) ?? [];
    dates.push(completion.date);
    datesByHabit.set(completion.habitId, dates);
  }

  return habits.map((h) =>
    computeHabitStats(
      {
        id: h.id,
        name: h.name,
        frequency: h.frequency as HabitFrequency,
        daysOfWeek: h.daysOfWeek,
        timesPerWeek: h.timesPerWeek,
        timesPerMonth: h.timesPerMonth,
      },
      datesByHabit.get(h.id) ?? [],
      year,
      month,
    ),
  );
}

export async function getPillarStats(
  userId: string,
  year: number,
  month: number,
): Promise<PillarStats[]> {
  const pillars = await prisma.pillar.findMany({
    where: { userId },
    include: {
      habits: {
        where: { isActive: true },
        select: {
          id: true,
          frequency: true,
          daysOfWeek: true,
          timesPerWeek: true,
          timesPerMonth: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const habitIds = pillars.flatMap((p) => p.habits.map((h) => h.id));
  const { from, to } = getMonthRange(year, month);

  const completions =
    habitIds.length > 0
      ? await prisma.habitCompletion.findMany({
          where: {
            habitId: { in: habitIds },
            date: { gte: from, lte: to },
          },
          select: { habitId: true },
        })
      : [];

  const completedByHabit = new Map<string, number>();
  for (const completion of completions) {
    completedByHabit.set(completion.habitId, (completedByHabit.get(completion.habitId) ?? 0) + 1);
  }

  return pillars.map((pillar) => {
    let completed = 0;
    let total = 0;
    for (const habit of pillar.habits) {
      completed += completedByHabit.get(habit.id) ?? 0;
      total += expectedCompletions(frequencyParams(habit), from, to);
    }
    return {
      pillarId: pillar.id,
      pillarName: pillar.name,
      color: pillar.color,
      activeHabitCount: pillar.habits.length,
      completed,
      total,
      completionRate: completionRate(completed, total),
    };
  });
}

export async function getOverview(
  userId: string,
  year: number,
  month: number,
): Promise<StatsOverview> {
  const [pillarStats, habitStats, monthly] = await Promise.all([
    getPillarStats(userId, year, month),
    getHabitStatsList(userId, year, month),
    getMonthlyStats(userId, year, month),
  ]);

  return {
    year,
    month,
    totalCompletions: monthly.totalCompletions,
    successRate: monthly.successRate,
    pillarStats,
    habitStats,
  };
}

export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyStats> {
  const { from, to } = getMonthRange(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
  });

  const habitIds = habits.map((h) => h.id);

  if (habitIds.length === 0) {
    return { dailyCounts: [], habitProgress: [], totalCompletions: 0, successRate: 0 };
  }

  const completions = await prisma.habitCompletion.findMany({
    where: {
      habitId: { in: habitIds },
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });

  const dailyCounts: { date: string; count: number }[] = [];
  const countsByDay = new Map<string, number>();

  for (const completion of completions) {
    const key = `${completion.date.getUTCFullYear()}-${String(completion.date.getUTCMonth() + 1).padStart(2, "0")}-${String(completion.date.getUTCDate()).padStart(2, "0")}`;
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dailyCounts.push({ date: dateStr, count: countsByDay.get(dateStr) ?? 0 });
  }

  const completedByHabit = new Map<string, number>();
  for (const completion of completions) {
    completedByHabit.set(completion.habitId, (completedByHabit.get(completion.habitId) ?? 0) + 1);
  }

  const habitProgress = habits.map((h) => ({
    habitId: h.id,
    habitName: h.name,
    completed: completedByHabit.get(h.id) ?? 0,
    goal: expectedCompletions(frequencyParams(h), from, to),
  }));

  const totalCompletions = completions.length;
  const totalPossible = habits.reduce(
    (sum, h) => sum + expectedCompletions(frequencyParams(h), from, to),
    0,
  );
  const successRate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;

  return { dailyCounts, habitProgress, totalCompletions, successRate };
}

export async function getHeatmap(
  userId: string,
  year: number,
  month: number | null,
): Promise<HeatmapResponse> {
  const { from, to } = month ? getMonthRange(year, month) : getYearRange(year);

  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });

  const habitIds = habits.map((h) => h.id);
  const completions =
    habitIds.length > 0
      ? await prisma.habitCompletion.findMany({
          where: {
            habitId: { in: habitIds },
            date: { gte: from, lte: to },
          },
          select: { date: true },
        })
      : [];

  const { days, maxCount } = buildHeatmapDays(
    completions.map((c) => c.date),
    year,
    month,
  );

  return { year, month, maxCount, days };
}

function mondayOf(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7;
  return addDays(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), -day);
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function countInRange(keys: Set<string> | undefined, from: Date, to: Date): number {
  if (!keys) return 0;
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  let count = 0;
  for (const key of keys) {
    if (key >= fromKey && key <= toKey) count++;
  }
  return count;
}

function consistencyScore(counts: number[]): number {
  if (counts.length === 0) return 0;
  const mean = counts.reduce((s, x) => s + x, 0) / counts.length;
  if (mean === 0) return 0;
  const variance = counts.reduce((s, x) => s + (x - mean) ** 2, 0) / counts.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
}

export async function getAnalytics(userId: string, weeks: number): Promise<AnalyticsResponse> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentWeekStart = mondayOf(today);
  const firstWeekStart = addDays(currentWeekStart, -(weeks - 1) * 7);

  const months: { start: Date; end: Date; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    months.push({ start, end, label: monthLabel(start) });
  }
  const from = months[0]!.start;

  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const habitIds = habits.map((h) => h.id);

  const completions =
    habitIds.length > 0
      ? await prisma.habitCompletion.findMany({
          where: { habitId: { in: habitIds }, date: { gte: from, lte: today } },
          select: { habitId: true, date: true },
        })
      : [];

  const completedByHabit = new Map<string, Set<string>>();
  const completedByDay = new Map<string, number>();
  for (const c of completions) {
    const key = toDateKey(c.date);
    let set = completedByHabit.get(c.habitId);
    if (!set) {
      set = new Set();
      completedByHabit.set(c.habitId, set);
    }
    set.add(key);
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
  }

  const freqOf = (h: (typeof habits)[number]): FrequencyParams => ({
    frequency: h.frequency as HabitFrequency,
    daysOfWeek: h.daysOfWeek,
    timesPerWeek: h.timesPerWeek,
    timesPerMonth: h.timesPerMonth,
  });

  const weeklyRates = [];
  for (let w = 0; w < weeks; w++) {
    const ws = addDays(firstWeekStart, w * 7);
    const we = addDays(ws, 6) > today ? today : addDays(ws, 6);
    let completed = 0;
    let expected = 0;
    for (const h of habits) {
      expected += expectedCompletions(freqOf(h), ws, we);
      completed += countInRange(completedByHabit.get(h.id), ws, we);
    }
    weeklyRates.push({
      label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      from: toDateKey(ws),
      to: toDateKey(we),
      rate: completionRate(completed, expected),
      completed,
      expected,
    });
  }

  const completedWeeks = weeklyRates.slice(0, weeks - 1);
  const recent = completedWeeks.slice(-4);
  const prior = completedWeeks.slice(-8, -4);
  let trend: AnalyticsResponse["trend"] = { direction: "stable", delta: 0 };
  if (recent.length > 0 && prior.length > 0) {
    const avgRecent = recent.reduce((s, w) => s + w.rate, 0) / recent.length;
    const avgPrior = prior.reduce((s, w) => s + w.rate, 0) / prior.length;
    const delta = Math.round(avgRecent - avgPrior);
    trend = { delta, direction: delta >= 3 ? "up" : delta <= -3 ? "down" : "stable" };
  }

  const monthlyRates = months.map(({ start, end, label }) => {
    let completed = 0;
    let expected = 0;
    for (const h of habits) {
      expected += expectedCompletions(freqOf(h), start, end);
      completed += countInRange(completedByHabit.get(h.id), start, end);
    }
    return {
      label,
      from: toDateKey(start),
      to: toDateKey(end),
      rate: completionRate(completed, expected),
      completed,
      expected,
    };
  });

  const windowDays: number[] = [];
  for (let d = firstWeekStart; d <= today; d = addDays(d, 1)) {
    windowDays.push(completedByDay.get(toDateKey(d)) ?? 0);
  }
  const dailyAverage = windowDays.length > 0 ? Math.round((windowDays.reduce((s, x) => s + x, 0) / windowDays.length) * 10) / 10 : 0;
  const consistency = consistencyScore(windowDays);

  const habitConsistency = habits
    .map((h) => {
      const days = completedByHabit.get(h.id) ?? new Set<string>();
      const perDay = [];
      for (let d = from; d <= today; d = addDays(d, 1)) {
        perDay.push(days.has(toDateKey(d)) ? 1 : 0);
      }
      return {
        habitId: h.id,
        habitName: h.name,
        rate: completionRate(countInRange(days, from, today), expectedCompletions(freqOf(h), from, today)),
        consistency: consistencyScore(perDay),
      };
    })
    .sort((a, b) => b.consistency - a.consistency);

  const streakHistory = months.map(({ start, end, label }) => {
    let best = 0;
    for (const h of habits) {
      const keys = new Set([...(completedByHabit.get(h.id) ?? [])].filter((k) => k >= toDateKey(start) && k <= toDateKey(end)));
      best = Math.max(best, getBestStreakForFrequency(freqOf(h), keys));
    }
    return { label, bestStreak: best };
  });

  const pillarStats = await getPillarStats(userId, now.getUTCFullYear(), now.getUTCMonth() + 1);

  return {
    from: toDateKey(from),
    to: toDateKey(today),
    weeks,
    weeklyRates,
    monthlyRates,
    trend,
    consistency,
    dailyAverage,
    habitConsistency,
    streakHistory,
    pillarStats,
  };
}
