import fp from 'fastify-plugin';
import csrf from '@fastify/csrf-protection';
import type { FastifyInstance } from 'fastify';

export const csrfPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(csrf, {
    cookieOpts: { signed: true }
  });
});
