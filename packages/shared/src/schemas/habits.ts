import { z } from "zod";

export const HABIT_FREQUENCIES = [
  "DAILY",
  "WEEKLY_DAYS",
  "TIMES_PER_WEEK",
  "TIMES_PER_MONTH",
] as const;

export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");

const frequencyFields = {
  frequency: z.enum(HABIT_FREQUENCIES).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  timesPerWeek: z.number().int().min(1).max(7).optional(),
  timesPerMonth: z.number().int().min(1).max(31).optional(),
};

export function validateFrequencyParams(
  data: {
    frequency?: HabitFrequency | undefined;
    daysOfWeek?: number[] | undefined;
    timesPerWeek?: number | undefined;
    timesPerMonth?: number | undefined;
  },
  ctx: z.RefinementCtx,
): void {
  if (!data.frequency) return;

  switch (data.frequency) {
    case "DAILY":
      return;
    case "WEEKLY_DAYS": {
      const days = data.daysOfWeek ?? [];
      if (days.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["daysOfWeek"],
          message: "Select at least one day of the week",
        });
      } else if (new Set(days).size !== days.length) {
        ctx.addIssue({
          code: "custom",
          path: ["daysOfWeek"],
          message: "Days of the week must be unique",
        });
      }
      return;
    }
    case "TIMES_PER_WEEK":
      if (data.timesPerWeek === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["timesPerWeek"],
          message: "timesPerWeek is required for this frequency",
        });
      }
      return;
    case "TIMES_PER_MONTH":
      if (data.timesPerMonth === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["timesPerMonth"],
          message: "timesPerMonth is required for this frequency",
        });
      }
      return;
  }
}

export const createHabitBodySchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    pillarId: z.uuid(),
    icon: z.string().max(50).optional(),
    color: hexColor.optional(),
    ...frequencyFields,
  })
  .superRefine(validateFrequencyParams);

export type CreateHabitBody = z.infer<typeof createHabitBodySchema>;

export const updateHabitBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    pillarId: z.uuid().optional(),
    icon: z.string().max(50).optional().nullable(),
    color: hexColor.optional().nullable(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    ...frequencyFields,
  })
  .superRefine(validateFrequencyParams);

export type UpdateHabitBody = z.infer<typeof updateHabitBodySchema>;

export const habitReorderBodySchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

export type HabitReorderBody = z.infer<typeof habitReorderBodySchema>;

export interface HabitResponse {
  id: string;
  name: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitHistoryDay {
  date: string;
  weekday: number;
  scheduled: boolean;
  completed: boolean;
}

export interface HabitHistory {
  habitId: string;
  habitName: string;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
  from: string;
  to: string;
  days: HabitHistoryDay[];
  expected: number;
  actual: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  comparison: {
    current: number;
    previous: number;
    delta: number;
  };
}
