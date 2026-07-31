import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

export const helmetPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(helmet, {
    // The API only serves JSON, so a Content-Security-Policy is not needed.
    contentSecurityPolicy: false,
  });
});
