import { z } from "zod";

export const habitStatsSchema = z.object({
  habitId: z.string(),
  habitName: z.string(),
  completionRate: z.number(),
  currentStreak: z.number(),
  bestStreak: z.number(),
});

export type HabitStats = z.infer<typeof habitStatsSchema>;

export const pillarStatsSchema = z.object({
  pillarId: z.string(),
  pillarName: z.string(),
  color: z.string().nullable(),
  activeHabitCount: z.number(),
  completed: z.number(),
  total: z.number(),
  completionRate: z.number(),
});

export type PillarStats = z.infer<typeof pillarStatsSchema>;

export const monthlyStatsSchema = z.object({
  dailyCounts: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    }),
  ),
  habitProgress: z.array(
    z.object({
      habitId: z.string(),
      habitName: z.string(),
      completed: z.number(),
      goal: z.number().nullable(),
    }),
  ),
  totalCompletions: z.number(),
  successRate: z.number(),
});

export type MonthlyStats = z.infer<typeof monthlyStatsSchema>;

export const statsOverviewSchema = z.object({
  year: z.number(),
  month: z.number(),
  totalCompletions: z.number(),
  successRate: z.number(),
  pillarStats: z.array(pillarStatsSchema),
  habitStats: z.array(habitStatsSchema),
});

export type StatsOverview = z.infer<typeof statsOverviewSchema>;
