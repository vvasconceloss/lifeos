import { prisma } from "../../db/client";
import { generateToken, hashToken, TOKEN_TTLS } from "../../lib/tokens";
import { comparePassword, hashPassword } from "../auth/auth.service";

export const ACCOUNT_ERRORS = {
  INCORRECT_PASSWORD: "Current password is incorrect",
  SAME_PASSWORD: "New password must be different from the current one",
  NEW_EMAIL_SAME: "New email must be different from the current one",
} as const;

/**
 * Changes the authenticated user's password. Requires the current password as
 * confirmation and bumps `passwordChangedAt` (invalidating other sessions).
 * The caller preserves the current session by issuing a fresh JWT.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(ACCOUNT_ERRORS.INCORRECT_PASSWORD);

  if (!comparePassword(currentPassword, user.passwordHash)) {
    throw new Error(ACCOUNT_ERRORS.INCORRECT_PASSWORD);
  }

  if (currentPassword === newPassword) {
    throw new Error(ACCOUNT_ERRORS.SAME_PASSWORD);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword), passwordChangedAt: new Date() },
  });
}

export type RequestEmailChangeResult =
  | { status: "requested"; confirmToken: string; cancelToken: string }
  // Email already belongs to another account → generic success, nothing sent.
  | { status: "unavailable" };

/**
 * Requests an email change. Creates a single-use EmailChangeToken (1 h TTL)
 * with a confirm token (for the new address) and a cancel token (for the old).
 * If `newEmail` already belongs to another account, returns "unavailable" and
 * creates/sends nothing — the caller responds generically (anti-enumeration).
 */
export async function requestEmailChange(
  userId: string,
  currentPassword: string,
  newEmail: string,
): Promise<RequestEmailChangeResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(ACCOUNT_ERRORS.INCORRECT_PASSWORD);

  if (!comparePassword(currentPassword, user.passwordHash)) {
    throw new Error(ACCOUNT_ERRORS.INCORRECT_PASSWORD);
  }

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    throw new Error(ACCOUNT_ERRORS.NEW_EMAIL_SAME);
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) return { status: "unavailable" };

  const confirmToken = generateToken();
  const cancelToken = generateToken();

  await prisma.$transaction([
    prisma.emailChangeToken.deleteMany({ where: { userId } }),
    prisma.emailChangeToken.create({
      data: {
        userId,
        newEmail,
        confirmTokenHash: hashToken(confirmToken),
        cancelTokenHash: hashToken(cancelToken),
        expiresAt: new Date(Date.now() + TOKEN_TTLS.EMAIL_CHANGE),
      },
    }),
  ]);

  return { status: "requested", confirmToken, cancelToken };
}

export type ConfirmEmailChangeResult =
  | { status: "confirmed"; email: string; previousEmail: string }
  | { status: "expired" }
  | { status: "invalid" };

/**
 * Confirms an email change. Single-use: on success the token is deleted, the
 * email is updated (stays verified — it was verified through this flow) and
 * `passwordChangedAt` is bumped to invalidate other sessions.
 */
export async function confirmEmailChange(
  token: string,
): Promise<ConfirmEmailChangeResult> {
  const record = await prisma.emailChangeToken.findUnique({
    where: { confirmTokenHash: hashToken(token) },
  });

  if (!record) return { status: "invalid" };

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return { status: "invalid" };

  if (record.expiresAt < new Date()) {
    await prisma.emailChangeToken.delete({ where: { id: record.id } });
    return { status: "expired" };
  }

  const previousEmail = user.email;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { email: record.newEmail, emailVerified: true, passwordChangedAt: new Date() },
    }),
    prisma.emailChangeToken.delete({ where: { id: record.id } }),
  ]);

  return { status: "confirmed", email: record.newEmail, previousEmail };
}

/** Cancels a pending email change for the authenticated user (idempotent). */
export async function cancelEmailChange(userId: string): Promise<void> {
  await prisma.emailChangeToken.deleteMany({ where: { userId } });
}

export type CancelEmailChangeResult = "cancelled" | "invalid";

/**
 * Cancels a pending email change via the single-use cancel link sent to the old
 * email (no login required). Idempotent: already-cancelled/invalid tokens return
 * "cancelled" so the page always shows a friendly confirmation.
 */
export async function cancelEmailChangeByToken(
  token: string,
): Promise<CancelEmailChangeResult> {
  const record = await prisma.emailChangeToken.findUnique({
    where: { cancelTokenHash: hashToken(token) },
  });

  if (!record) return "cancelled";

  await prisma.emailChangeToken.delete({ where: { id: record.id } });
  return "cancelled";
}
