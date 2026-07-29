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

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export const authResponseSchema = z.object({
  user: userResponseSchema,
  token: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const meResponseSchema = z.object({
  user: userResponseSchema,
});

export type MeResponse = z.infer<typeof meResponseSchema>;
