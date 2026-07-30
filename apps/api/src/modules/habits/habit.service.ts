import { prisma } from "../../db/client";
import { PILLAR_ERRORS } from "../pillars/pillar.service";
import type { CreateHabitBody, HabitResponse, UpdateHabitBody } from "./habit.schemas";

function toResponse(habit: {
  id: string;
  name: string;
  description: string | null;
  pillarId: string;
  isActive: boolean;
  monthlyGoal: number | null;
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
    isActive: habit.isActive,
    monthlyGoal: habit.monthlyGoal,
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

  const habit = await prisma.habit.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      userId,
      pillarId: data.pillarId,
      ...(data.monthlyGoal !== undefined ? { monthlyGoal: data.monthlyGoal } : {}),
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

  const habit = await prisma.habit.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.pillarId !== undefined && { pillarId: data.pillarId }),
      ...(data.monthlyGoal !== undefined ? { monthlyGoal: data.monthlyGoal } : {}),
    },
    include: { pillar: { select: { name: true } } },
  });

  return { habit: toResponse(habit) };
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
    orderBy: { createdAt: "asc" },
  });

  return habits.map(toResponse);
}
