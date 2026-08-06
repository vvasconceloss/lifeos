import { z } from "zod";
import { dateKeySchema } from "./common";

export const createDailyLogBodySchema = z.object({
  date: dateKeySchema,
  mood: z.number().int().min(1).max(10).optional(),
  energy: z.number().int().min(1).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  notes: z.string().max(5000).optional(),
});

export type CreateDailyLogBody = z.infer<typeof createDailyLogBodySchema>;

export const updateDailyLogBodySchema = z.object({
  mood: z.number().int().min(1).max(10).optional().nullable(),
  energy: z.number().int().min(1).max(10).optional().nullable(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type UpdateDailyLogBody = z.infer<typeof updateDailyLogBodySchema>;

export const dailyLogDateParamSchema = z.object({
  date: dateKeySchema,
});

export type DailyLogDateParam = z.infer<typeof dailyLogDateParamSchema>;

export interface DailyLogResponse {
  id: string;
  date: string;
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyLogCorrelation {
  label: string;
  rate: number;
  days: number;
}

export interface DailyLogCorrelations {
  sleep: DailyLogCorrelation[];
  mood: DailyLogCorrelation[];
  energy: DailyLogCorrelation[];
}
