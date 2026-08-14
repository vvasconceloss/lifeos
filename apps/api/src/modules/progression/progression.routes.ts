import type { FastifyInstance } from 'fastify';
import { requireActive, requireVerified } from '../../plugins/auth';
import { getProgression } from './progression.service';

export async function progressionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: [requireVerified, requireActive] },
    async (request) => {
      const progression = await getProgression(request.user.sub);
      return { progression };
    },
  );
}
