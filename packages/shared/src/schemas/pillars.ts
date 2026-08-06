import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");

export const createPillarBodySchema = z.object({
  name: z.string().min(1).max(100),
  color: hexColor.optional(),
  icon: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export type CreatePillarBody = z.infer<typeof createPillarBodySchema>;

export const updatePillarBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: hexColor.optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export type UpdatePillarBody = z.infer<typeof updatePillarBodySchema>;

export const pillarReorderBodySchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

export type PillarReorderBody = z.infer<typeof pillarReorderBodySchema>;

export interface PillarResponse {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
