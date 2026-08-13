import type { FastifyReply } from "fastify";
import type { z } from "zod";
import { toErrorBody } from "./errors";

export function validateInput<T>(
  schema: z.ZodType<T>,
  value: unknown,
  reply: FastifyReply,
): T | null {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    reply.status(400).send({
      error: toErrorBody("Validation failed", parsed.error.issues, "VALIDATION_ERROR"),
    });
    return null;
  }

  return parsed.data;
}
