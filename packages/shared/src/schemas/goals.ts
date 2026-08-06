import { z } from "zod";
import { dateKeySchema } from "./common";

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

export const goalResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  pillarId: z.string(),
  pillarName: z.string(),
  pillarColor: z.string().nullable(),
  status: z.enum(GOAL_STATUSES),
  deadline: z.string().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  progress: z.number(),
  habitCount: z.number(),
});

export type GoalResponse = z.infer<typeof goalResponseSchema>;

export const goalHabitProgressSchema = z.object({
  habitId: z.string(),
  habitName: z.string(),
  frequency: z.enum(["DAILY", "WEEKLY_DAYS", "TIMES_PER_WEEK", "TIMES_PER_MONTH"]),
  rate: z.number(),
});

export type GoalHabitProgress = z.infer<typeof goalHabitProgressSchema>;

export const goalProgressPointSchema = z.object({
  label: z.string(),
  progress: z.number(),
});

export type GoalProgressPoint = z.infer<typeof goalProgressPointSchema>;

export const goalDetailResponseSchema = goalResponseSchema
  .omit({ habitCount: true })
  .extend({
    habits: z.array(goalHabitProgressSchema),
    progressHistory: z.array(goalProgressPointSchema),
  });

export type GoalDetailResponse = z.infer<typeof goalDetailResponseSchema>;
