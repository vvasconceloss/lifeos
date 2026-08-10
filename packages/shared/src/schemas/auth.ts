import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");

export const onboardingBodySchema = z.object({
  pillars: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        color: hexColor.optional(),
        icon: z.string().max(50).optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .max(20),
  habits: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        pillarIndex: z.number().int().min(0).max(19),
        icon: z.string().max(50).optional(),
        color: hexColor.optional(),
      }),
    )
    .max(50),
});

export type OnboardingBody = z.infer<typeof onboardingBodySchema>;

export interface OnboardingResponse {
  user: UserResponse;
  pillarsCreated: number;
  habitsCreated: number;
}

export const registerBodySchema = z.object({
  email: z.email().min(5).max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-zA-Z]/, "Password must include at least one letter")
    .regex(/\d/, "Password must include at least one number"),
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
  onboarded: z.boolean().optional(),
  gamification: z.boolean().optional(),
});

export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  weekStart: number;
  theme: string;
  onboarded: boolean;
  gamification: boolean;
  isDemo: boolean;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export interface MeResponse {
  user: UserResponse;
}
