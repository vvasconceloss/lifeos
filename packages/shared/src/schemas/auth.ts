import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.email().min(5).max(254),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100).optional(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.email().min(1),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const updateMeBodySchema = z.object({
  name: z.string().min(1).max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  weekStart: z.number().int().min(0).max(6).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  weekStart: number;
  theme: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export interface MeResponse {
  user: UserResponse;
}
