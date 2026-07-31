import { z } from "zod";

const dateKey = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Invalid date format, expected YYYY-MM-DD",
  )
  .refine(
    (value) => {
      const [year, month, day] = value.split("-").map(Number) as [number, number, number];
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    },
    "Invalid calendar date",
  );

export const idParamSchema = z.object({
  id: z.uuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;

export const completionParamsSchema = z.object({
  id: z.uuid(),
  date: dateKey,
});

export type CompletionParams = z.infer<typeof completionParamsSchema>;

export const listCompletionsQuerySchema = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
});

export type ListCompletionsQuery = z.infer<typeof listCompletionsQuerySchema>;

export const listHabitsQuerySchema = z.object({
  includeArchived: z.enum(["true", "false"]).optional(),
});

export type ListHabitsQuery = z.infer<typeof listHabitsQuerySchema>;

export const statsQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;
