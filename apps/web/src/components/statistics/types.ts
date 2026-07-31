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

export function formatMonthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
