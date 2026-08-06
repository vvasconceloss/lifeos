import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");

export const createPillarBodySchema = z.object({
  name: z.string().min(1).max(100),
  color: hexColor.optional(),
});

export type CreatePillarBody = z.infer<typeof createPillarBodySchema>;

export const updatePillarBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: hexColor.optional().nullable(),
});

export type UpdatePillarBody = z.infer<typeof updatePillarBodySchema>;

export interface PillarResponse {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}
