import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client';

export async function systemRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  fastify.get('/health/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch (error) {
      request.log.error({ err: error }, 'Database health check failed');
      return reply.status(503).send({ status: 'unavailable', db: 'error' });
    }
  });
}
