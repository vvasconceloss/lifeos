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
