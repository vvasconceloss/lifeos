import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createEmailService, loadEmailConfig, type EmailService } from "../lib/email";

declare module "fastify" {
  interface FastifyInstance {
    emailService: EmailService;
  }
}

export const emailPlugin = fp(
  async (fastify: FastifyInstance, opts: { emailService?: EmailService }) => {
    const emailService =
      opts?.emailService ??
      createEmailService({
        config: loadEmailConfig(),
        logger: fastify.log as unknown as Pick<Console, "warn" | "error">,
      });
    fastify.decorate("emailService", emailService);
  },
  { name: "emailPlugin" },
);

