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

export interface StatsOverview {
  year: number;
  month: number;
  totalCompletions: number;
  successRate: number;
  pillarStats: PillarStats[];
  habitStats: HabitStats[];
}

import { activeLocale } from "@/lib/i18n-format";

export function formatMonthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(activeLocale(), {
    month: "long",
    year: "numeric",
  }).format(date);
}
