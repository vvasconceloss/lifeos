import { listPillars } from './pillar.service';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';

export async function pillarRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const pillars = await listPillars(request.user.sub);
      return { pillars };
    },
  );
}
