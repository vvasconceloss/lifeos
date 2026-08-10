import { prisma } from "../../db/client";
import type { ProgressionResponse, PillarProgression } from "@lifeos/shared";
import {
  completionRate,
  expectedCompletions,
  getCurrentStreakForFrequency,
  type FrequencyParams,
} from "../../lib/frequency";
import { addDays, toDateKey } from "../stats/stats.utils";
import { listGoals } from "../goals/goal.service";
import { listProjects } from "../projects/project.service";
import {
  levelInfoOf,
  pillarXp,
  xpBreakdown,
} from "./progression.lib";

const RATE_WINDOW_DAYS = 90;
const STREAK_LOOKBACK_DAYS = 370;

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function freqOf(habit: {
  frequency: string;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
}): FrequencyParams {
  return {
    frequency: habit.frequency as FrequencyParams["frequency"],
    daysOfWeek: habit.daysOfWeek,
    timesPerWeek: habit.timesPerWeek,
    timesPerMonth: habit.timesPerMonth,
  };
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

export async function getProgression(userId: string): Promise<ProgressionResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gamification: true, weekStart: true },
  });

  if (!user?.gamification) {
    return { enabled: false, overall: null, pillars: [] };
  }

  const weekStart = user.weekStart;
  const today = utcMidnight(new Date());
  const rateFrom = addDays(today, -(RATE_WINDOW_DAYS - 1));
  const streakFrom = addDays(today, -(STREAK_LOOKBACK_DAYS - 1));

  const [pillars, habits, goals, projects] = await Promise.all([
    prisma.pillar.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.habit.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        pillarId: true,
        frequency: true,
        daysOfWeek: true,
        timesPerWeek: true,
        timesPerMonth: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    listGoals(userId),
    listProjects(userId),
  ]);

  const habitIds = habits.map((h) => h.id);
  const completions =
    habitIds.length > 0
      ? await prisma.habitCompletion.findMany({
          where: { habitId: { in: habitIds }, date: { gte: streakFrom, lte: today } },
          select: { habitId: true, date: true },
        })
      : [];

  const keysByHabit = new Map<string, Set<string>>();
  for (const completion of completions) {
    let set = keysByHabit.get(completion.habitId);
    if (!set) {
      set = new Set();
      keysByHabit.set(completion.habitId, set);
    }
    set.add(toDateKey(completion.date));
  }

  const pillarProgressions: PillarProgression[] = pillars.map((pillar) => {
    const pillarHabits = habits.filter((h) => h.pillarId === pillar.id);

    let completed = 0;
    let expected = 0;
    let activeStreaks = 0;
    for (const habit of pillarHabits) {
      const keys = keysByHabit.get(habit.id) ?? new Set<string>();
      expected += expectedCompletions(freqOf(habit), rateFrom, today);
      completed += countInRange(keys, rateFrom, today);
      if (getCurrentStreakForFrequency(freqOf(habit), keys, today, weekStart) > 0) {
        activeStreaks++;
      }
    }

    const habitRate = completionRate(completed, expected);
    const consistency = pillarHabits.length > 0
      ? Math.round((activeStreaks / pillarHabits.length) * 100)
      : 0;

    const pillarGoals = goals.filter((g) => g.pillarId === pillar.id);
    const goalRate = pillarGoals.length > 0
      ? Math.round(pillarGoals.reduce((sum, g) => sum + g.progress, 0) / pillarGoals.length)
      : 0;

    const pillarProjects = projects.filter((p) => p.pillarId === pillar.id);
    const projectRate = pillarProjects.length > 0
      ? Math.round(pillarProjects.reduce((sum, p) => sum + p.progress, 0) / pillarProjects.length)
      : 0;

    const rates = { habits: habitRate, goals: goalRate, projects: projectRate, consistency };
    const xp = pillarXp(rates);

    return {
      ...levelInfoOf(xp),
      pillarId: pillar.id,
      pillarName: pillar.name,
      color: pillar.color,
      rates,
      breakdown: xpBreakdown(rates),
    };
  });

  const overallXp = pillarProgressions.reduce((sum, p) => sum + p.xp, 0);

  return {
    enabled: true,
    overall: levelInfoOf(overallXp),
    pillars: pillarProgressions,
  };
}
