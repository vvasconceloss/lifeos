import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { createPillarBodySchema } from './pillar.schemas';
import { createPillar, listPillars } from './pillar.service';

export async function pillarRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const pillars = await listPillars(request.user.sub);
      return { pillars };
    },
  );

  fastify.post(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = createPillarBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      const pillar = await createPillar(
        request.user.sub,
        parsed.data.name,
      );

      return reply.status(201).send({ pillar });
    },
  );
}
