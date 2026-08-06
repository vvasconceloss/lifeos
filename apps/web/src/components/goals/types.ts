import type { GoalStatus, HabitFrequency } from "@lifeos/shared";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  pillarColor: string | null;
  status: GoalStatus;
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
  habitCount: number;
}

export interface GoalHabitProgress {
  habitId: string;
  habitName: string;
  frequency: HabitFrequency;
  rate: number;
}

export interface GoalProgressPoint {
  label: string;
  progress: number;
}

export interface GoalDetail extends Omit<Goal, "habitCount"> {
  habits: GoalHabitProgress[];
  progressHistory: GoalProgressPoint[];
}
