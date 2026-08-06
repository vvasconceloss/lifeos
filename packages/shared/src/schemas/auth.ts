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

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export interface MeResponse {
  user: UserResponse;
}
