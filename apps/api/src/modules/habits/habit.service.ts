import { prisma } from "../../db/client";
import type {
  CreateHabitBody,
  HabitFrequency,
  HabitHistory,
  HabitResponse,
  UpdateHabitBody,
} from "./habit.schemas";
import {
  buildHistoryDays,
  completionRate,
  expectedCompletions,
  getBestStreakForFrequency,
  getCurrentStreakForFrequency,
  type FrequencyParams,
} from "../../lib/frequency";
import { addDays, toDateKey } from "../stats/stats.utils";

const MS_PER_DAY = 86400000;

type HabitFrequencyData = {
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
};

function frequencyData(
  data: {
    frequency?: HabitFrequency | undefined;
    daysOfWeek?: number[] | undefined;
    timesPerWeek?: number | undefined;
    timesPerMonth?: number | undefined;
  },
  fallback: "create" | "none",
): HabitFrequencyData | null {
  const frequency = data.frequency ?? (fallback === "create" ? "DAILY" : undefined);
  if (!frequency) return null;

  const base: HabitFrequencyData = {
    frequency,
    daysOfWeek: [],
    timesPerWeek: null,
    timesPerMonth: null,
  };

  switch (frequency) {
    case "WEEKLY_DAYS":
      return { ...base, daysOfWeek: data.daysOfWeek ?? [] };
    case "TIMES_PER_WEEK":
      return { ...base, timesPerWeek: data.timesPerWeek ?? null };
    case "TIMES_PER_MONTH":
      return { ...base, timesPerMonth: data.timesPerMonth ?? null };
    default:
      return base;
  }
}

function toResponse(habit: {
  id: string;
  name: string;
  description: string | null;
  pillarId: string;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pillar: { name: string };
}): HabitResponse {
  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    pillarId: habit.pillarId,
    pillarName: habit.pillar.name,
    frequency: habit.frequency,
    daysOfWeek: habit.daysOfWeek,
    timesPerWeek: habit.timesPerWeek,
    timesPerMonth: habit.timesPerMonth,
    icon: habit.icon,
    color: habit.color,
    sortOrder: habit.sortOrder,
    isActive: habit.isActive,
    archivedAt: habit.archivedAt,
    createdAt: habit.createdAt,
    updatedAt: habit.updatedAt,
  };
}

export async function createHabit(
  userId: string,
  data: CreateHabitBody,
): Promise<{ habit: HabitResponse } | { error: string; status: number }> {
  const pillar = await prisma.pillar.findFirst({
    where: { id: data.pillarId, userId },
  });

  if (!pillar) {
    return { error: "Pillar not found", status: 404 };
  }

  const frequency = frequencyData(data, "create")!;

  const habit = await prisma.habit.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      userId,
      pillarId: data.pillarId,
      frequency: frequency.frequency,
      daysOfWeek: frequency.daysOfWeek,
      timesPerWeek: frequency.timesPerWeek,
      timesPerMonth: frequency.timesPerMonth,
      ...(data.icon ? { icon: data.icon } : {}),
      ...(data.color ? { color: data.color } : {}),
    },
    include: { pillar: { select: { name: true } } },
  });

  return { habit: toResponse(habit) };
}

export async function getHabit(
  id: string,
  userId: string,
): Promise<HabitResponse | null> {
  const habit = await prisma.habit.findFirst({
    where: { id, userId },
    include: { pillar: { select: { name: true } } },
  });

  return habit ? toResponse(habit) : null;
}

export async function updateHabit(
  id: string,
  userId: string,
  data: UpdateHabitBody,
): Promise<{ habit: HabitResponse } | { error: string; status: number }> {
  const existing = await prisma.habit.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { error: "Habit not found", status: 404 };
  }

  if (data.pillarId) {
    const pillar = await prisma.pillar.findFirst({
      where: { id: data.pillarId, userId },
    });

    if (!pillar) {
      return { error: "Pillar not found", status: 404 };
    }
  }

  const frequency = frequencyData(data, "none");

  const habit = await prisma.habit.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.pillarId !== undefined && { pillarId: data.pillarId }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(frequency
        ? {
            frequency: frequency.frequency,
            daysOfWeek: frequency.daysOfWeek,
            timesPerWeek: frequency.timesPerWeek,
            timesPerMonth: frequency.timesPerMonth,
          }
        : {}),
    },
    include: { pillar: { select: { name: true } } },
  });

  return { habit: toResponse(habit) };
}

export async function reorderHabits(
  userId: string,
  ids: string[],
): Promise<{ error: string; status: number } | { count: number }> {
  const owned = await prisma.habit.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });

  if (owned.length !== ids.length) {
    return { error: "Habit not found", status: 404 };
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.habit.update({ where: { id }, data: { sortOrder: index } })),
  );

  return { count: ids.length };
}

export async function archiveHabit(
  id: string,
  userId: string,
): Promise<{ habit: HabitResponse } | { error: string; status: number }> {
  const existing = await prisma.habit.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { error: "Habit not found", status: 404 };
  }

  const habit = await prisma.habit.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
    },
    include: { pillar: { select: { name: true } } },
  });

  return { habit: toResponse(habit) };
}

export async function deleteHabit(
  id: string,
  userId: string,
): Promise<true | { error: string; status: number }> {
  const existing = await prisma.habit.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { error: "Habit not found", status: 404 };
  }

  await prisma.habit.delete({ where: { id } });
  return true;
}

export async function listHabits(
  userId: string,
  includeArchived = false,
): Promise<HabitResponse[]> {
  const habits = await prisma.habit.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { isActive: true }),
    },
    include: {
      pillar: { select: { name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return habits.map(toResponse);
}

function dayKeyRange(from?: string, to?: string): { from: Date; to: Date } {
  const today = new Date();
  const end = to
    ? new Date(`${to}T00:00:00.000Z`)
    : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = from ? new Date(`${from}T00:00:00.000Z`) : addDays(end, -29);
  return { from: start, to: end };
}

function countKeys(keys: Set<string>, from: Date, to: Date): number {
  let count = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (keys.has(toDateKey(d))) count++;
  }
  return count;
}

export async function getHabitHistory(
  habitId: string,
  userId: string,
  from?: string,
  to?: string,
): Promise<HabitHistory | null> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) return null;

  const weekStart = (await prisma.user.findUnique({ where: { id: userId }, select: { weekStart: true } }))?.weekStart ?? 1;

  const { from: start, to: end } = dayKeyRange(from, to);
  const windowLen = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(windowLen - 1));

  const completions = await prisma.habitCompletion.findMany({
    where: { habitId },
    select: { date: true },
  });
  const keys = new Set(completions.map((c) => toDateKey(c.date)));

  const freq: FrequencyParams = {
    frequency: habit.frequency as HabitFrequency,
    daysOfWeek: habit.daysOfWeek,
    timesPerWeek: habit.timesPerWeek,
    timesPerMonth: habit.timesPerMonth,
  };

  const expected = expectedCompletions(freq, start, end);
  const actual = countKeys(keys, start, end);
  const currentRate = completionRate(actual, expected);
  const previousRate = completionRate(
    countKeys(keys, prevStart, prevEnd),
    expectedCompletions(freq, prevStart, prevEnd),
  );

  return {
    habitId: habit.id,
    habitName: habit.name,
    frequency: habit.frequency as HabitFrequency,
    daysOfWeek: habit.daysOfWeek,
    timesPerWeek: habit.timesPerWeek,
    timesPerMonth: habit.timesPerMonth,
    from: toDateKey(start),
    to: toDateKey(end),
    days: buildHistoryDays(freq, start, end, keys),
    expected,
    actual,
    completionRate: currentRate,
    currentStreak: getCurrentStreakForFrequency(freq, keys, end, weekStart),
    bestStreak: getBestStreakForFrequency(freq, keys, weekStart),
    comparison: {
      current: currentRate,
      previous: previousRate,
      delta: currentRate - previousRate,
    },
  };
}
