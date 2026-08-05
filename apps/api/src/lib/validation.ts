import type { FastifyReply } from "fastify";
import type { z } from "zod";

export function validateInput<T>(
  schema: z.ZodType<T>,
  value: unknown,
  reply: FastifyReply,
): T | null {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    reply.status(400).send({
      error: "Validation failed",
      details: parsed.error.issues,
    });
    return null;
  }

  return parsed.data;
}
