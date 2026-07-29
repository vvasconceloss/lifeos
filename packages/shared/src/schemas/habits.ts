import { z } from "zod";

export const createHabitBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  pillarId: z.string(),
});

export type CreateHabitBody = z.infer<typeof createHabitBodySchema>;

export const updateHabitBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  pillarId: z.string().optional(),
});

export type UpdateHabitBody = z.infer<typeof updateHabitBodySchema>;

export const habitResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  pillarId: z.string(),
  pillarName: z.string(),
  isActive: z.boolean(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type HabitResponse = z.infer<typeof habitResponseSchema>;
