import type { FastifyRequest, FastifyReply } from "fastify";
import { toErrorBody } from "../lib/errors";
import { prisma } from "../db/client";

function unauthorized(reply: FastifyReply): void {
  reply.status(401).send({ error: toErrorBody("Unauthorized", undefined, "UNAUTHORIZED") });
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    unauthorized(reply);
    return;
  }

  // After a password reset/change, every JWT issued before `passwordChangedAt`
  // is rejected — forces a fresh login on all devices. JWT `iat` has second
  // resolution, so compare at the second granularity (a token re-issued in the
  // same second as the change must still be accepted).
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { passwordChangedAt: true },
  });

  const issuedAt = request.user.iat ?? 0;
  const changedAtSeconds = user?.passwordChangedAt
    ? Math.floor(user.passwordChangedAt.getTime() / 1000)
    : 0;
  if (issuedAt < changedAtSeconds) {
    unauthorized(reply);
  }
}

/**
 * Blocks sensitive account actions (change email, delete account) for users who
 * have not verified their email yet (Option B access policy). Returns 403.
 */
export async function requireVerified(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified) {
    reply
      .status(403)
      .send({ error: toErrorBody("Please verify your email to continue", undefined, "EMAIL_NOT_VERIFIED") });
  }
}

/**
 * Blocks accounts that are in the 15-day PENDING_DELETION grace period from the
 * normal application — they only get the dedicated recovery screen. Keeps the
 * basic modules (pillars, habits, completions, auth) usable for unverified users.
 */
export async function requireActive(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { status: true },
  });

  if (user?.status === "PENDING_DELETION") {
    reply
      .status(403)
      .send({
        error: toErrorBody(
          "This account is scheduled for deletion. Please recover it first.",
          undefined,
          "ACCOUNT_PENDING_DELETION",
        ),
      });
  }
}
