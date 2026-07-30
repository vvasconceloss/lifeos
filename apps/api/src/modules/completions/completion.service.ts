import { prisma } from "../../db/client";
import type { CompletionResponse } from "./completion.schemas";

function toResponse(completion: {
  id: string;
  habitId: string;
  date: Date;
  createdAt: Date;
}): CompletionResponse {
  return {
    id: completion.id,
    habitId: completion.habitId,
    date: completion.date,
    createdAt: completion.createdAt,
  };
}

export async function markCompletion(
  habitId: string,
  userId: string,
  date: string,
): Promise<
  | { completion: CompletionResponse }
  | { error: string; status: number }
> {
  const dateStart = new Date(date);
  dateStart.setUTCHours(0, 0, 0, 0);

  if (dateStart > new Date()) {
    return { error: "Cannot mark future dates", status: 400 };
  }

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) {
    return { error: "Habit not found", status: 404 };
  }

  const completion = await prisma.habitCompletion.upsert({
    where: {
      habitId_date: { habitId, date: dateStart },
    },
    create: {
      habitId,
      date: dateStart,
    },
    update: {},
  });

  return { completion: toResponse(completion) };
}

export async function unmarkCompletion(
  habitId: string,
  userId: string,
  date: string,
): Promise<true | { error: string; status: number }> {
  const dateStart = new Date(date);
  dateStart.setUTCHours(0, 0, 0, 0);

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) {
    return { error: "Habit not found", status: 404 };
  }

  const completion = await prisma.habitCompletion.findUnique({
    where: {
      habitId_date: { habitId, date: dateStart },
    },
  });

  if (!completion) {
    return { error: "Completion not found", status: 404 };
  }

  await prisma.habitCompletion.delete({
    where: { id: completion.id },
  });

  return true;
}

export interface MonthlyStats {
  dailyCounts: { date: string; count: number }[];
  habitProgress: { habitId: string; habitName: string; completed: number; goal: number | null }[];
  totalCompletions: number;
  successRate: number;
}

export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyStats> {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

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

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyCounts: { date: string; count: number }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = completions.filter((c) => {
      const cd = c.date;
      return cd.getUTCFullYear() === year && cd.getUTCMonth() === month - 1 && cd.getUTCDate() === d;
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

export async function listCompletions(
  userId: string,
  from?: string,
  to?: string,
): Promise<CompletionResponse[]> {
  const habits = await prisma.habit.findMany({
    where: { userId },
    select: { id: true },
  });

  const habitIds = habits.map((h) => h.id);

  if (habitIds.length === 0) return [];

  const dateFilter: { gte?: Date; lte?: Date } = {};

  if (from) {
    const d = new Date(from);
    d.setUTCHours(0, 0, 0, 0);
    dateFilter.gte = d;
  }

  if (to) {
    const d = new Date(to);
    d.setUTCHours(23, 59, 59, 999);
    dateFilter.lte = d;
  }

  const completions = await prisma.habitCompletion.findMany({
    where: {
      habitId: { in: habitIds },
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    orderBy: { date: "asc" },
  });

  return completions.map(toResponse);
}
