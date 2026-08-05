import { prisma } from "../../db/client";
import type { HabitFrequency, HabitStats, HeatmapResponse, MonthlyStats, PillarStats, StatsOverview } from "./stats.schemas";
import {
  buildDailyKeySet,
  buildHeatmapDays,
  getDaysInMonth,
  getMonthRange,
  getMonthReference,
  getYearRange,
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
