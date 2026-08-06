import { z } from "zod";

export const analyticsQuerySchema = z.object({
  weeks: z.coerce.number().int().min(4).max(52).optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface HabitStats {
  habitId: string;
  habitName: string;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface PillarStats {
  pillarId: string;
  pillarName: string;
  color: string | null;
  activeHabitCount: number;
  completed: number;
  total: number;
  completionRate: number;
}

export interface MonthlyStats {
  dailyCounts: { date: string; count: number }[];
  habitProgress: { habitId: string; habitName: string; completed: number; goal: number | null }[];
  totalCompletions: number;
  successRate: number;
}

export interface StatsOverview {
  year: number;
  month: number;
  totalCompletions: number;
  successRate: number;
  pillarStats: PillarStats[];
  habitStats: HabitStats[];
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: number;
}

export interface HeatmapResponse {
  year: number;
  month: number | null;
  maxCount: number;
  days: HeatmapDay[];
}

export interface AnalyticsTrend {
  direction: "up" | "down" | "stable";
  delta: number;
}

export interface AnalyticsRatePoint {
  label: string;
  from: string;
  to: string;
  rate: number;
  completed: number;
  expected: number;
}

export interface AnalyticsHabitConsistency {
  habitId: string;
  habitName: string;
  rate: number;
  consistency: number;
}

export interface AnalyticsStreakPoint {
  label: string;
  bestStreak: number;
}

export interface AnalyticsResponse {
  from: string;
  to: string;
  weeks: number;
  weeklyRates: AnalyticsRatePoint[];
  monthlyRates: AnalyticsRatePoint[];
  trend: AnalyticsTrend;
  consistency: number;
  dailyAverage: number;
  habitConsistency: AnalyticsHabitConsistency[];
  streakHistory: AnalyticsStreakPoint[];
  pillarStats: PillarStats[];
}
