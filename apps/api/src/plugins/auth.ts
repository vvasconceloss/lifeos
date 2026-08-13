import type { FastifyRequest, FastifyReply } from "fastify";
import { toErrorBody } from "../lib/errors";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: toErrorBody("Unauthorized", undefined, "UNAUTHORIZED") });
  }
}
