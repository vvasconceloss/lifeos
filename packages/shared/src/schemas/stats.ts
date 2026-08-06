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

export const heatmapDaySchema = z.object({
  date: z.string(),
  count: z.number(),
  level: z.number(),
});

export type HeatmapDay = z.infer<typeof heatmapDaySchema>;

export const heatmapResponseSchema = z.object({
  year: z.number(),
  month: z.number().nullable(),
  maxCount: z.number(),
  days: z.array(heatmapDaySchema),
});

export type HeatmapResponse = z.infer<typeof heatmapResponseSchema>;

export const analyticsTrendSchema = z.object({
  direction: z.enum(["up", "down", "stable"]),
  delta: z.number(),
});

export type AnalyticsTrend = z.infer<typeof analyticsTrendSchema>;

export const analyticsRatePointSchema = z.object({
  label: z.string(),
  from: z.string(),
  to: z.string(),
  rate: z.number(),
  completed: z.number(),
  expected: z.number(),
});

export type AnalyticsRatePoint = z.infer<typeof analyticsRatePointSchema>;

export const analyticsHabitConsistencySchema = z.object({
  habitId: z.string(),
  habitName: z.string(),
  rate: z.number(),
  consistency: z.number(),
});

export type AnalyticsHabitConsistency = z.infer<typeof analyticsHabitConsistencySchema>;

export const analyticsStreakPointSchema = z.object({
  label: z.string(),
  bestStreak: z.number(),
});

export type AnalyticsStreakPoint = z.infer<typeof analyticsStreakPointSchema>;

export const analyticsResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  weeks: z.number(),
  weeklyRates: z.array(analyticsRatePointSchema),
  monthlyRates: z.array(analyticsRatePointSchema),
  trend: analyticsTrendSchema,
  consistency: z.number(),
  dailyAverage: z.number(),
  habitConsistency: z.array(analyticsHabitConsistencySchema),
  streakHistory: z.array(analyticsStreakPointSchema),
  pillarStats: z.array(pillarStatsSchema),
});

export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;

export const analyticsQuerySchema = z.object({
  weeks: z.coerce.number().int().min(4).max(52).optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
