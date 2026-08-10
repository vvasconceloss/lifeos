import { prisma } from "../../db/client";
import type {
  CreateGoalBody,
  GoalDetailResponse,
  GoalHabitProgress,
  GoalProgressPoint,
  GoalResponse,
  UpdateGoalBody,
} from "./goal.schemas";
import {
  completionRate,
  expectedCompletions,
  type FrequencyParams,
} from "../../lib/frequency";
import { addDays, toDateKey } from "../stats/stats.utils";

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function mondayOf(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7;
  return addDays(utcMidnight(date), -day);
}

function countKeys(keys: Set<string> | undefined, from: Date, to: Date): number {
  if (!keys) return 0;
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  let count = 0;
  for (const key of keys) {
    if (key >= fromKey && key <= toKey) count++;
  }
  return count;
}

function rateOf(freq: FrequencyParams, keys: Set<string> | undefined, from: Date, to: Date): number {
  if (from > to) return 0;
  return completionRate(countKeys(keys, from, to), expectedCompletions(freq, from, to));
}

type AssocHabit = {
  createdAt: Date;
  habit: {
    id: string;
    name: string;
    frequency: string;
    daysOfWeek: number[];
    timesPerWeek: number | null;
    timesPerMonth: number | null;
    createdAt: Date;
  };
};

function freqOf(h: AssocHabit["habit"]): FrequencyParams {
  return {
    frequency: h.frequency as FrequencyParams["frequency"],
    daysOfWeek: h.daysOfWeek,
    timesPerWeek: h.timesPerWeek,
    timesPerMonth: h.timesPerMonth,
  };
}

function computeView(
  goal: {
    id: string;
    title: string;
    description: string | null;
    pillarId: string;
    pillar: { name: string; color: string | null };
    status: string;
    deadline: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  associations: AssocHabit[],
  keysByHabit: Map<string, Set<string>>,
  today: Date,
  withHistory: boolean,
): { response: GoalResponse; habits: GoalHabitProgress[]; history: GoalProgressPoint[] } {
  const habits = associations.map(({ createdAt, habit }) => {
    const start = utcMidnight(createdAt);
    return {
      habitId: habit.id,
      habitName: habit.name,
      frequency: habit.frequency as GoalHabitProgress["frequency"],
      rate: rateOf(freqOf(habit), keysByHabit.get(habit.id), start, today),
    };
  });

  const progress =
    habits.length > 0
      ? Math.round(habits.reduce((s, h) => s + h.rate, 0) / habits.length)
      : 0;

  const history: GoalProgressPoint[] = [];
  if (withHistory) {
    const currentWeekStart = mondayOf(today);
    for (let w = 7; w >= 0; w--) {
      const ws = addDays(currentWeekStart, -w * 7);
      const we = addDays(ws, 6) > today ? today : addDays(ws, 6);
      const rates = associations.map(({ createdAt, habit }) =>
        rateOf(freqOf(habit), keysByHabit.get(habit.id), utcMidnight(createdAt), we),
      );
      history.push({
        label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        progress: rates.length > 0 ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : 0,
      });
    }
  }

  const base = {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    pillarId: goal.pillarId,
    pillarName: goal.pillar.name,
    pillarColor: goal.pillar.color,
    status: goal.status as GoalResponse["status"],
    deadline: goal.deadline ? toDateKey(goal.deadline) : null,
    completedAt: goal.completedAt,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    progress,
    habitCount: associations.length,
  };

  return { response: base, habits, history };
}

function deadlineDate(deadline?: string | null): Date | null | undefined {
  if (deadline === undefined) return undefined;
  if (deadline === null) return null;
  return new Date(`${deadline}T00:00:00.000Z`);
}

export async function createGoal(
  userId: string,
  data: CreateGoalBody,
): Promise<{ goal: GoalResponse } | { error: string; status: number }> {
  const pillar = await prisma.pillar.findFirst({
    where: { id: data.pillarId, userId },
  });
  if (!pillar) return { error: "Pillar not found", status: 404 };

  const goal = await prisma.goal.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      userId,
      pillarId: data.pillarId,
      deadline: deadlineDate(data.deadline) ?? null,
    },
    include: { pillar: { select: { name: true, color: true } }, habits: true },
  });

  return {
    goal: computeView(goal, [], new Map(), utcMidnight(new Date()), false).response,
  };
}

export async function listGoals(userId: string): Promise<GoalResponse[]> {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { pillar: { select: { name: true, color: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (goals.length === 0) return [];

  const goalIds = goals.map((g) => g.id);
  const associations = await prisma.goalHabit.findMany({
    where: { goalId: { in: goalIds } },
    include: { habit: true },
  });
  const byGoal = new Map<string, AssocHabit[]>();
  for (const a of associations) {
    const list = byGoal.get(a.goalId) ?? [];
    list.push({ createdAt: a.createdAt, habit: a.habit });
    byGoal.set(a.goalId, list);
  }

  const habitIds = [...new Set(associations.map((a) => a.habitId))];
  const completions = habitIds.length > 0
    ? await prisma.habitCompletion.findMany({
        where: { habitId: { in: habitIds } },
        select: { habitId: true, date: true },
      })
    : [];
  const keysByHabit = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = keysByHabit.get(c.habitId) ?? new Set<string>();
    set.add(toDateKey(c.date));
    keysByHabit.set(c.habitId, set);
  }

  const today = utcMidnight(new Date());
  return goals.map((g) =>
    computeView(g, byGoal.get(g.id) ?? [], keysByHabit, today, false).response,
  );
}

export async function getGoal(
  goalId: string,
  userId: string,
): Promise<GoalDetailResponse | null> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: { pillar: { select: { name: true, color: true } }, habits: { include: { habit: true } } },
  });
  if (!goal) return null;

  const associations: AssocHabit[] = goal.habits.map((a) => ({
    createdAt: a.createdAt,
    habit: a.habit,
  }));

  const completions = associations.length > 0
    ? await prisma.habitCompletion.findMany({
        where: { habitId: { in: associations.map((a) => a.habit.id) } },
        select: { habitId: true, date: true },
      })
    : [];
  const keysByHabit = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = keysByHabit.get(c.habitId) ?? new Set<string>();
    set.add(toDateKey(c.date));
    keysByHabit.set(c.habitId, set);
  }

  const today = utcMidnight(new Date());
  const { response, habits, history } = computeView(goal, associations, keysByHabit, today, true);

  const {
    id,
    title,
    description,
    pillarId,
    pillarName,
    pillarColor,
    status,
    deadline,
    completedAt,
    createdAt,
    updatedAt,
    progress,
  } = response;

  return {
    id,
    title,
    description,
    pillarId,
    pillarName,
    pillarColor,
    status,
    deadline,
    completedAt,
    createdAt,
    updatedAt,
    progress,
    habits,
    progressHistory: history,
  };
}

export async function updateGoal(
  goalId: string,
  userId: string,
  data: UpdateGoalBody,
): Promise<{ goal: GoalResponse } | { error: string; status: number }> {
  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: { pillar: { select: { name: true, color: true } }, habits: true },
  });
  if (!existing) return { error: "Goal not found", status: 404 };

  if (data.pillarId) {
    const pillar = await prisma.pillar.findFirst({ where: { id: data.pillarId, userId } });
    if (!pillar) return { error: "Pillar not found", status: 404 };
  }

  const status = data.status;
  const deadline = deadlineDate(data.deadline);

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.pillarId !== undefined && { pillarId: data.pillarId }),
      ...(deadline !== undefined && { deadline }),
      ...(status !== undefined && {
        status: status as never,
        completedAt: status === "COMPLETED" ? new Date() : null,
      }),
    },
    include: { pillar: { select: { name: true, color: true } }, habits: { include: { habit: true } } },
  });

  const associations: AssocHabit[] = updated.habits.map((a) => ({
    createdAt: a.createdAt,
    habit: a.habit,
  }));
  const completions = associations.length > 0
    ? await prisma.habitCompletion.findMany({
        where: { habitId: { in: associations.map((a) => a.habit.id) } },
        select: { habitId: true, date: true },
      })
    : [];
  const keysByHabit = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = keysByHabit.get(c.habitId) ?? new Set<string>();
    set.add(toDateKey(c.date));
    keysByHabit.set(c.habitId, set);
  }

  const today = utcMidnight(new Date());
  const { response } = computeView(updated, associations, keysByHabit, today, false);
  return { goal: response };
}

export async function deleteGoal(
  goalId: string,
  userId: string,
): Promise<true | { error: string; status: number }> {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) return { error: "Goal not found", status: 404 };
  await prisma.goal.delete({ where: { id: goalId } });
  return true;
}

export async function addHabitToGoal(
  goalId: string,
  userId: string,
  habitId: string,
): Promise<{ habitCount: number } | { error: string; status: number }> {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return { error: "Goal not found", status: 404 };

  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return { error: "Habit not found", status: 404 };

  if (habit.pillarId !== goal.pillarId) {
    return { error: "Habit must belong to the goal's pillar", status: 400 };
  }

  await prisma.goalHabit.upsert({
    where: { goalId_habitId: { goalId, habitId } },
    create: { goalId, habitId },
    update: {},
  });

  const count = await prisma.goalHabit.count({ where: { goalId } });
  return { habitCount: count };
}

export async function removeHabitFromGoal(
  goalId: string,
  userId: string,
  habitId: string,
): Promise<{ habitCount: number } | { error: string; status: number }> {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return { error: "Goal not found", status: 404 };

  await prisma.goalHabit.deleteMany({ where: { goalId, habitId } });

  const count = await prisma.goalHabit.count({ where: { goalId } });
  return { habitCount: count };
}
