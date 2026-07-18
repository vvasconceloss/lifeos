import type { FastifyInstance } from 'fastify';

export async function systemRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });
}
