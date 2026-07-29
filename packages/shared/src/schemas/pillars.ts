import { z } from "zod";

export const createPillarBodySchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreatePillarBody = z.infer<typeof createPillarBodySchema>;

export const updatePillarBodySchema = z.object({
  name: z.string().min(1).max(100),
});

export type UpdatePillarBody = z.infer<typeof updatePillarBodySchema>;

export const pillarResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PillarResponse = z.infer<typeof pillarResponseSchema>;
