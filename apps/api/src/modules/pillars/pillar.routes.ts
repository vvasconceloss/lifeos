import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { createPillarBodySchema, updatePillarBodySchema } from './pillar.schemas';
import { createPillar, deletePillar, listPillars, updatePillar, PILLAR_ERRORS } from './pillar.service';

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

  fastify.patch(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const parsed = updatePillarBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      const pillar = await updatePillar(
        id,
        request.user.sub,
        parsed.data.name,
      );

      if (!pillar) {
        return reply.status(404).send({ error: 'Pillar not found' });
      }

      return { pillar };
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await deletePillar(id, request.user.sub);

      if (!result.success) {
        if (result.reason === PILLAR_ERRORS.NOT_FOUND) {
          return reply.status(404).send({ error: result.reason });
        }
        return reply.status(409).send({ error: result.reason });
      }

      return reply.status(204).send();
    },
  );
}
