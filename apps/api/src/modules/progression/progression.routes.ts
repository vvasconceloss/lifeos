import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { getProgression } from './progression.service';

export async function progressionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireAuth },
    async (request) => {
      const progression = await getProgression(request.user.sub);
      return { progression };
    },
  );
}
