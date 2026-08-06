import { z } from "zod";
import { dateKeySchema } from "./common";
import type { HabitFrequency } from "./habits";

export const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "ABANDONED"] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const createGoalBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pillarId: z.uuid(),
  deadline: dateKeySchema.optional(),
});

export type CreateGoalBody = z.infer<typeof createGoalBodySchema>;

export const updateGoalBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  pillarId: z.uuid().optional(),
  deadline: dateKeySchema.optional().nullable(),
  status: z.enum(GOAL_STATUSES).optional(),
});

export type UpdateGoalBody = z.infer<typeof updateGoalBodySchema>;

export interface GoalResponse {
  id: string;
  title: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  pillarColor: string | null;
  status: GoalStatus;
  deadline: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

export interface GoalDetailResponse extends Omit<GoalResponse, "habitCount"> {
  habits: GoalHabitProgress[];
  progressHistory: GoalProgressPoint[];
}
