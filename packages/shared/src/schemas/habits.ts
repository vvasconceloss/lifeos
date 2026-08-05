import { z } from "zod";

export const HABIT_FREQUENCIES = [
  "DAILY",
  "WEEKLY_DAYS",
  "TIMES_PER_WEEK",
  "TIMES_PER_MONTH",
] as const;

export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

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
    ...frequencyFields,
  })
  .superRefine(validateFrequencyParams);

export type CreateHabitBody = z.infer<typeof createHabitBodySchema>;

export const updateHabitBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    pillarId: z.uuid().optional(),
    ...frequencyFields,
  })
  .superRefine(validateFrequencyParams);

export type UpdateHabitBody = z.infer<typeof updateHabitBodySchema>;

export const habitResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  pillarId: z.string(),
  pillarName: z.string(),
  frequency: z.enum(HABIT_FREQUENCIES),
  daysOfWeek: z.array(z.number()),
  timesPerWeek: z.number().nullable(),
  timesPerMonth: z.number().nullable(),
  isActive: z.boolean(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type HabitResponse = z.infer<typeof habitResponseSchema>;

export const habitHistoryDaySchema = z.object({
  date: z.string(),
  weekday: z.number(),
  scheduled: z.boolean(),
  completed: z.boolean(),
});

export type HabitHistoryDay = z.infer<typeof habitHistoryDaySchema>;

export const habitHistorySchema = z.object({
  habitId: z.string(),
  habitName: z.string(),
  frequency: z.enum(HABIT_FREQUENCIES),
  daysOfWeek: z.array(z.number()),
  timesPerWeek: z.number().nullable(),
  timesPerMonth: z.number().nullable(),
  from: z.string(),
  to: z.string(),
  days: z.array(habitHistoryDaySchema),
  expected: z.number(),
  actual: z.number(),
  completionRate: z.number(),
  currentStreak: z.number(),
  bestStreak: z.number(),
  comparison: z.object({
    current: z.number(),
    previous: z.number(),
    delta: z.number(),
  }),
});

export type HabitHistory = z.infer<typeof habitHistorySchema>;
