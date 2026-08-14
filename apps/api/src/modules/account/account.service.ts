import { createHash } from "node:crypto";
import { prisma } from "../../db/client";
import { generateToken, hashToken, TOKEN_TTLS } from "../../lib/tokens";
import { comparePassword, hashPassword } from "../auth/auth.service";

export const ACCOUNT_ERRORS = {
  INCORRECT_PASSWORD: "Current password is incorrect",
  SAME_PASSWORD: "New password must be different from the current one",
  NEW_EMAIL_SAME: "New email must be different from the current one",
  ALREADY_PENDING_DELETION: "Account deletion has already been requested",
} as const;

export const DELETION_GRACE_PERIOD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

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
  | { status: "confirmed"; email: string; previousEmail: string; locale: string }
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

  return { status: "confirmed", email: record.newEmail, previousEmail, locale: user.locale };
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

export interface DeletionRequestResult {
  recoveryToken: string;
  scheduledDeletionAt: Date;
  locale: string;
}

/**
 * Requests account deletion: sets status = PENDING_DELETION, records the request
 * and the scheduled deletion (+15 days), issues a single-use recovery token and
 * bumps passwordChangedAt to invalidate all active sessions. Requires the current
 * password as confirmation.
 */
export async function requestAccountDeletion(
  userId: string,
  currentPassword: string,
): Promise<DeletionRequestResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(ACCOUNT_ERRORS.INCORRECT_PASSWORD);

  if (!comparePassword(currentPassword, user.passwordHash)) {
    throw new Error(ACCOUNT_ERRORS.INCORRECT_PASSWORD);
  }

  if (user.status === "PENDING_DELETION") {
    throw new Error(ACCOUNT_ERRORS.ALREADY_PENDING_DELETION);
  }

  const now = new Date();
  const scheduledDeletionAt = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS);
  const recoveryToken = generateToken();

  await prisma.$transaction([
    prisma.accountDeletionToken.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "PENDING_DELETION",
        deletionRequestedAt: now,
        scheduledDeletionAt,
        passwordChangedAt: now,
      },
    }),
    prisma.accountDeletionToken.create({
      data: {
        userId,
        tokenHash: hashToken(recoveryToken),
        expiresAt: scheduledDeletionAt,
      },
    }),
  ]);

  return { recoveryToken, scheduledDeletionAt, locale: user.locale };
}

export type RecoverAccountResult =
  | { status: "recovered"; email: string; locale: string }
  | { status: "expired" }
  | { status: "invalid" };

/**
 * Reverts a PENDING_DELETION account back to ACTIVE using the single-use recovery
 * token from the email (no login required). A nonexistent token is reported as
 * invalid (generic error). Idempotency for the already-active case is handled by
 * the authenticated Path B (`cancelAccountDeletion`).
 */
export async function recoverAccount(token: string): Promise<RecoverAccountResult> {
  const record = await prisma.accountDeletionToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) return { status: "invalid" };

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return { status: "invalid" };

  if (record.expiresAt < new Date()) {
    await prisma.accountDeletionToken.delete({ where: { id: record.id } });
    return { status: "expired" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        deletionRequestedAt: null,
        scheduledDeletionAt: null,
      },
    }),
    prisma.accountDeletionToken.delete({ where: { id: record.id } }),
  ]);

  return { status: "recovered", email: user.email, locale: user.locale };
}

export interface CancelledDeletionResult {
  email: string;
  locale: string;
}

/**
 * Cancels a pending deletion for an authenticated user (Path B recovery).
 * Idempotent: recovering an already-active account produces no error.
 */
export async function cancelAccountDeletion(userId: string): Promise<CancelledDeletionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, locale: true },
  });
  if (!user) throw new Error("User not found");

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: userId, status: "PENDING_DELETION" },
      data: {
        status: "ACTIVE",
        deletionRequestedAt: null,
        scheduledDeletionAt: null,
      },
    }),
    prisma.accountDeletionToken.deleteMany({ where: { userId } }),
  ]);

  return { email: user.email, locale: user.locale };
}

export interface DeletedAccount {
  userIdHash: string;
  email: string;
}

export interface ProcessDeletionsResult {
  deleted: DeletedAccount[];
}

/**
 * Processes all accounts whose scheduled deletion date has passed. For each one,
 * the final email is sent first, then the user is hard-deleted (cascading to all
 * related data) and an anonymized audit event is logged. Idempotent: running it
 * twice never errors or deletes twice.
 */
export async function processAccountDeletions(
  sendEmail: (to: string, locale: string) => Promise<void>,
): Promise<ProcessDeletionsResult> {
  const due = await prisma.user.findMany({
    where: {
      status: "PENDING_DELETION",
      scheduledDeletionAt: { lte: new Date() },
    },
    select: { id: true, email: true, locale: true },
  });

  const deleted: DeletedAccount[] = [];

  for (const user of due) {
    // Final email must be sent before deletion — the address won't exist after.
    await sendEmail(user.email, user.locale);

    await prisma.user.delete({ where: { id: user.id } });

    const userIdHash = createHash("sha256").update(user.id).digest("hex");
    deleted.push({ userIdHash, email: user.email });
    console.log(`[account-deletion] deleted account ${userIdHash} at ${new Date().toISOString()}`);
  }

  return { deleted };
}
