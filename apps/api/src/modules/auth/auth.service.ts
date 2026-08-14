import bcrypt from "bcrypt";
import { prisma } from "../../db/client";
import { generateToken, hashToken, TOKEN_TTLS } from "../../lib/tokens";
import type { RegisterBody, UpdateMeBody, UserResponse, SupportedLocale } from "./auth.schemas";
const SALT_ROUNDS = 10;

export const DEMO_EMAIL = "demo@lifeos.com";
export const DEMO_PASSWORD = "demo-lifeos-2026";
export const DEMO_NAME = "Demo User";

export function isDemoEmail(email: string): boolean {
  return email === DEMO_EMAIL;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  weekStart: number;
  theme: string;
  locale: string;
  onboarded: boolean;
  gamification: boolean;
  emailVerified: boolean;
  status: string;
  deletionRequestedAt: Date | null;
  scheduledDeletionAt: Date | null;
  createdAt: Date;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    weekStart: user.weekStart,
    theme: user.theme,
    locale: user.locale as SupportedLocale,
    onboarded: user.onboarded,
    gamification: user.gamification,
    emailVerified: user.emailVerified,
    status: user.status as UserResponse["status"],
    deletionRequestedAt: user.deletionRequestedAt,
    scheduledDeletionAt: user.scheduledDeletionAt,
    isDemo: isDemoEmail(user.email),
    createdAt: user.createdAt,
  };
}

export async function createUser(data: RegisterBody): Promise<UserResponse> {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
  }

  const passwordHash = hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name ?? null,
    },
  });

  return toUserResponse(user);
}

export async function authenticate(
  email: string,
  password: string,
): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
  }

  const valid = comparePassword(password, user.passwordHash);

  if (!valid) {
    throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
  }

  return toUserResponse(user);
}

export async function getUserById(
  id: string,
): Promise<UserResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return null;
  }

  return toUserResponse(user);
}

export async function updateUser(
  userId: string,
  data: UpdateMeBody,
): Promise<UserResponse> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.weekStart !== undefined && { weekStart: data.weekStart }),
      ...(data.theme !== undefined && { theme: data.theme }),
      ...(data.locale !== undefined && { locale: data.locale }),
      ...(data.onboarded !== undefined && { onboarded: data.onboarded }),
      ...(data.gamification !== undefined && { gamification: data.gamification }),
    },
  });

  return toUserResponse(user);
}

/**
 * Creates a single-use email-verification token for the user, invalidating any
 * previous one. Returns the plaintext token (never persisted) for the email.
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const token = generateToken();
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTLS.EMAIL_VERIFICATION),
      },
    }),
  ]);
  return token;
}

export type VerifyEmailResult =
  | { status: "verified" }
  | { status: "expired" }
  | { status: "already-verified" }
  | { status: "invalid" };

/**
 * Verifies a token. Single-use: on success the token is deleted. Idempotent for
 * already-verified emails. An expired token is removed so a stale link can't linger.
 */
export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) return { status: "invalid" };

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return { status: "invalid" };

  if (user.emailVerified) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return { status: "already-verified" };
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return { status: "expired" };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return { status: "verified" };
}

/**
 * Resends a verification email for the given address. Returns nothing — callers
 * always respond with the same generic message so the endpoint never reveals
 * whether an email is registered (anti-enumeration).
 */
export async function resendVerification(
  email: string,
  sendEmail: (token: string, email: string, locale: string) => Promise<void>,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return;

  const token = await createVerificationToken(user.id);
  await sendEmail(token, user.email, user.locale);
}

/**
 * Creates a single-use password-reset token for the user (1 h TTL), invalidating
 * any previous one. Returns the plaintext token (never persisted) for the email.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTLS.PASSWORD_RESET),
      },
    }),
  ]);
  return token;
}

export type ResetPasswordResult =
  | { status: "reset"; email: string; locale: string }
  | { status: "expired" }
  | { status: "invalid" };

/**
 * Resets a password with a token. Single-use: on success the token is deleted,
 * `passwordChangedAt` is bumped (invalidating old sessions) and the new password
 * hash is stored. An expired token is removed so a stale link can't linger.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) return { status: "invalid" };

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return { status: "invalid" };

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return { status: "expired" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword), passwordChangedAt: new Date() },
    }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
  ]);

  return { status: "reset", email: user.email, locale: user.locale };
}

/**
 * Handles a password-reset request. Always runs equivalent work so the response
 * time doesn't reveal whether the email is registered. Returns nothing — callers
 * always respond with the same generic message (anti-enumeration).
 */
export async function forgotPassword(
  email: string,
  sendEmail: (token: string, email: string, locale: string) => Promise<void>,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !isDemoEmail(user.email)) {
    const token = await createPasswordResetToken(user.id);
    await sendEmail(token, user.email, user.locale);
    return;
  }

  // Consistent work for the "email doesn't exist" / demo path — equalise the
  // response time so the endpoint isn't an enumeration oracle.
  await bcrypt.hash(email, SALT_ROUNDS);
}

export const AUTH_ERRORS = {
  EMAIL_ALREADY_EXISTS: "Email already in use",
  INVALID_CREDENTIALS: "Invalid email or password",
} as const;
