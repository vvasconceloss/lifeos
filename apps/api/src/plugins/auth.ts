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
  // is rejected — forces a fresh login on all devices.
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { passwordChangedAt: true },
  });

  const issuedAt = request.user.iat ? new Date(request.user.iat * 1000) : null;
  if (user?.passwordChangedAt && issuedAt && issuedAt < user.passwordChangedAt) {
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
