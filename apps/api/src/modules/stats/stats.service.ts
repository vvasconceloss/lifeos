import { prisma } from "../../db/client";
import type { HabitStats, MonthlyStats, PillarStats, StatsOverview } from "./stats.schemas";
import {
  buildDailyKeySet,
  calculateCompletionRate,
  getBestStreak,
  getCurrentStreak,
  getDaysInMonth,
  getMonthRange,
  getMonthReference,
} from "./stats.utils";

function computeHabitStats(
  habit: { id: string; name: string; monthlyGoal: number | null },
  dates: Date[],
  year: number,
  month: number,
): HabitStats {
  const reference = getMonthReference(year, month);
  const allKeys = buildDailyKeySet(dates, reference);
  const { from, to } = getMonthRange(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const monthDates = dates.filter((d) => d >= from && d <= to);
  const monthKeys = buildDailyKeySet(monthDates, reference);

  return {
    habitId: habit.id,
    habitName: habit.name,
    completionRate: calculateCompletionRate(monthDates.length, habit.monthlyGoal, daysInMonth),
    currentStreak: getCurrentStreak(allKeys, reference),
    bestStreak: getBestStreak(monthKeys),
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
    { id: habit.id, name: habit.name, monthlyGoal: habit.monthlyGoal },
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
      { id: h.id, name: h.name, monthlyGoal: h.monthlyGoal },
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
        select: { id: true, monthlyGoal: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const habitIds = pillars.flatMap((p) => p.habits.map((h) => h.id));
  const { from, to } = getMonthRange(year, month);
  const daysInMonth = getDaysInMonth(year, month);

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
      total += habit.monthlyGoal ?? daysInMonth;
    }
    return {
      pillarId: pillar.id,
      pillarName: pillar.name,
      color: pillar.color,
      activeHabitCount: pillar.habits.length,
      completed,
      total,
      completionRate: calculateCompletionRate(completed, null, total),
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

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = completions.filter((c) => {
      const cd = c.date;
      return cd.getUTCFullYear() === year && cd.getUTCMonth() === month - 1 && cd.getUTCDate() === day;
    }).length;
    dailyCounts.push({ date: dateStr, count });
  }

  const habitProgress = habits.map((h) => {
    const completed = completions.filter((c) => c.habitId === h.id).length;
    return {
      habitId: h.id,
      habitName: h.name,
      completed,
      goal: h.monthlyGoal,
    };
  });

  const totalCompletions = completions.length;
  const totalPossible = habits.reduce((sum, h) => sum + (h.monthlyGoal ?? daysInMonth), 0);
  const successRate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;

  return { dailyCounts, habitProgress, totalCompletions, successRate };
}
