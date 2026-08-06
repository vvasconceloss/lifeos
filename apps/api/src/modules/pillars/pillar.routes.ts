import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import { createPillarBodySchema, updatePillarBodySchema, idParamSchema, pillarReorderBodySchema } from './pillar.schemas';
import { createPillar, deletePillar, listPillars, reorderPillars, updatePillar } from './pillar.service';

export async function pillarRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireAuth },
    async (request) => {
      const pillars = await listPillars(request.user.sub);
      return { pillars };
    },
  );

  fastify.post(
    '/reorder',
    { preHandler: requireAuth },
    async (request, reply) => {
      const data = validateInput(pillarReorderBodySchema, request.body, reply);
      if (!data) return;

      const result = await reorderPillars(request.user.sub, data.ids);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return result;
    },
  );

  fastify.post(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const data = validateInput(createPillarBodySchema, request.body, reply);
      if (!data) return;

      const pillar = await createPillar(
        request.user.sub,
        data,
      );

      return reply.status(201).send({ pillar });
    },
  );

  fastify.patch(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(updatePillarBodySchema, request.body, reply);
      if (!data) return;

      const result = await updatePillar(
        params.id,
        request.user.sub,
        data,
      );

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return { pillar: result.pillar };
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await deletePillar(params.id, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );
}
