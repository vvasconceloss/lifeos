import { prisma } from "../../db/client";
import type { AnalyticsResponse, HabitFrequency, HabitStats, HeatmapResponse, MonthlyStats, PillarStats, StatsOverview } from "./stats.schemas";
import {
  addDays,
  buildHeatmapDays,
  getDaysInMonth,
  getMonthRange,
  getMonthReference,
  getYearRange,
  toDateKey,
  weekStartOf,
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

/** Upper bound for current-streak lookback when loading completion history (≈1 year). */
const STREAK_LOOKBACK_DAYS = 370;

function countKeysInRange(keys: Set<string>, fromKey: string, toKey: string): number {
  let count = 0;
  for (const key of keys) {
    if (key >= fromKey && key <= toKey) count++;
  }
  return count;
}

async function getWeekStart(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { weekStart: true } });
  return user?.weekStart ?? 1;
}

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Effective end of a period for rate computations — never beyond today. */
function elapsedEnd(from: Date, to: Date, today: Date): Date {
  if (today < from) return from;
  return today < to ? today : to;
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
  completedKeys: Set<string>,
  reference: Date,
  from: Date,
  to: Date,
  weekStart = 1,
  rateTo = to,
): HabitStats {
  const freq = frequencyParams(habit);
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  const monthKeys = new Set([...completedKeys].filter((k) => k >= fromKey && k <= toKey));

  return {
    habitId: habit.id,
    habitName: habit.name,
    completionRate: completionRate(monthKeys.size, expectedCompletions(freq, from, rateTo)),
    currentStreak: getCurrentStreakForFrequency(freq, completedKeys, reference, weekStart),
    bestStreak: getBestStreakForFrequency(freq, monthKeys, weekStart),
  };
}

function habitInput(h: {
  id: string;
  name: string;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
}) {
  return {
    id: h.id,
    name: h.name,
    frequency: h.frequency,
    daysOfWeek: h.daysOfWeek,
    timesPerWeek: h.timesPerWeek,
    timesPerMonth: h.timesPerMonth,
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

  const reference = getMonthReference(year, month);
  const { from, to } = getMonthRange(year, month);
  const rateTo = elapsedEnd(from, to, utcMidnight(new Date()));
  const lookbackStart = addDays(reference, -STREAK_LOOKBACK_DAYS);
  const weekStart = await getWeekStart(userId);

  const completions = await prisma.habitCompletion.findMany({
    where: { habitId, date: { gte: lookbackStart, lte: to } },
    select: { date: true },
  });
  const keys = new Set(completions.map((c) => toDateKey(c.date)));

  return computeHabitStats(
    habitInput(habit as Parameters<typeof habitInput>[0]),
    keys,
    reference,
    from,
    to,
    weekStart,
    rateTo,
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
  const rateTo = elapsedEnd(from, to, utcMidnight(new Date()));

  const completions =
    habitIds.length > 0
      ? await prisma.habitCompletion.findMany({
          where: {
            habitId: { in: habitIds },
            date: { gte: from, lte: rateTo },
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
      total += expectedCompletions(frequencyParams(habit), from, rateTo);
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
  const { from, to } = getMonthRange(year, month);
  const reference = getMonthReference(year, month);
  const rateTo = elapsedEnd(from, to, utcMidnight(new Date()));
  const lookbackStart = addDays(reference, -STREAK_LOOKBACK_DAYS);
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  const weekStart = await getWeekStart(userId);

  const [habits, pillars] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pillar.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const habitIds = habits.map((h) => h.id);

  const completions =
    habitIds.length > 0
      ? await prisma.habitCompletion.findMany({
          where: { habitId: { in: habitIds }, date: { gte: lookbackStart, lte: to } },
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
    if (key >= fromKey && key <= toKey) {
      completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
    }
  }

  const habitStats = habits.map((h) =>
    computeHabitStats(
      habitInput(h),
      completedByHabit.get(h.id) ?? new Set(),
      reference,
      from,
      to,
      weekStart,
      rateTo,
    ),
  );

  const habitCountByPillar = new Map<string, number>();
  for (const h of habits) {
    habitCountByPillar.set(h.pillarId, (habitCountByPillar.get(h.pillarId) ?? 0) + 1);
  }

  const pillarStats = pillars.map((pillar) => {
    let completed = 0;
    let total = 0;
    for (const h of habits) {
      if (h.pillarId !== pillar.id) continue;
      total += expectedCompletions(frequencyParams(h), from, rateTo);
      completed += countKeysInRange(completedByHabit.get(h.id) ?? new Set(), fromKey, toKey);
    }
    return {
      pillarId: pillar.id,
      pillarName: pillar.name,
      color: pillar.color,
      activeHabitCount: habitCountByPillar.get(pillar.id) ?? 0,
      completed,
      total,
      completionRate: completionRate(completed, total),
    };
  });

  const daysInMonth = getDaysInMonth(year, month);
  const dailyCounts: { date: string; count: number }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dailyCounts.push({ date: dateStr, count: completedByDay.get(dateStr) ?? 0 });
  }

  const totalCompletions = dailyCounts.reduce((s, d) => s + d.count, 0);
  const totalPossible = habits.reduce(
    (s, h) => s + expectedCompletions(frequencyParams(h), from, rateTo),
    0,
  );
  const successRate = completionRate(totalCompletions, totalPossible);

  return { year, month, totalCompletions, successRate, pillarStats, habitStats };
}

export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyStats> {
  const { from, to } = getMonthRange(year, month);
  const rateTo = elapsedEnd(from, to, utcMidnight(new Date()));
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
    (sum, h) => sum + expectedCompletions(frequencyParams(h), from, rateTo),
    0,
  );
  const successRate = completionRate(totalCompletions, totalPossible);

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
  const weekStart = await getWeekStart(userId);
  const currentWeekStart = weekStartOf(today, weekStart);
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
    const effectiveEnd = elapsedEnd(start, end, today);
    let completed = 0;
    let expected = 0;
    for (const h of habits) {
      expected += expectedCompletions(freqOf(h), start, effectiveEnd);
      completed += countInRange(completedByHabit.get(h.id), start, effectiveEnd);
    }
    return {
      label,
      from: toDateKey(start),
      to: toDateKey(effectiveEnd),
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
      best = Math.max(best, getBestStreakForFrequency(freqOf(h), keys, weekStart));
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
