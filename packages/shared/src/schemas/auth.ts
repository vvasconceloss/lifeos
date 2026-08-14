import { z } from "zod";
import { passwordNotEqualToEmail, passwordSchema } from "./password";

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

export const registerBodySchema = passwordNotEqualToEmail(
  z.object({
    email: z.email().min(5).max(254),
    password: passwordSchema,
    name: z.string().min(1).max(100).optional(),
  }),
);

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.email().min(1),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;

export const resendVerificationBodySchema = z.object({
  email: z.email().min(1),
  // Internal path to return to after verification (optional). Must be a
  // same-origin path to avoid open-redirect abuse.
  redirect: z
    .string()
    .max(500)
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), {
      message: "Redirect must be an internal path",
    })
    .optional(),
});

export type ResendVerificationBody = z.infer<typeof resendVerificationBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: z.email().min(1),
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export const changeEmailRequestBodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newEmail: z.email().min(5).max(254),
});

export type ChangeEmailRequestBody = z.infer<typeof changeEmailRequestBodySchema>;

export const changeEmailConfirmBodySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type ChangeEmailConfirmBody = z.infer<typeof changeEmailConfirmBodySchema>;

export const changeEmailCancelBodySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type ChangeEmailCancelBody = z.infer<typeof changeEmailCancelBodySchema>;

export const deleteAccountBodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;

export const recoverAccountBodySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type RecoverAccountBody = z.infer<typeof recoverAccountBodySchema>;

export const cancelDeletionBodySchema = z.object({});

export type CancelDeletionBody = z.infer<typeof cancelDeletionBodySchema>;

export const SUPPORTED_LOCALES = ["en", "pt", "uk"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const updateMeBodySchema = z.object({
  name: z.string().min(1).max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  weekStart: z.number().int().min(0).max(6).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
  onboarded: z.boolean().optional(),
  gamification: z.boolean().optional(),
});

export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export type UserStatus = "ACTIVE" | "PENDING_DELETION";

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  weekStart: number;
  theme: string;
  locale: SupportedLocale;
  onboarded: boolean;
  gamification: boolean;
  emailVerified: boolean;
  status: UserStatus;
  deletionRequestedAt: Date | null;
  scheduledDeletionAt: Date | null;
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
