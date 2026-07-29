import { z } from "zod";

export const completionResponseSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  date: z.date(),
  createdAt: z.date(),
});

export type CompletionResponse = z.infer<typeof completionResponseSchema>;
