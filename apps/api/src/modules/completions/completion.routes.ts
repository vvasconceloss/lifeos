import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { completionParamsSchema, listCompletionsQuerySchema } from './completion.schemas';
import { listCompletions, markCompletion, unmarkCompletion } from './completion.service';

export async function completionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/completions',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = listCompletionsQuerySchema.safeParse(request.query);

      if (!query.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: query.error.issues,
        });
      }

      const completions = await listCompletions(
        request.user.sub,
        query.data.from,
        query.data.to,
      );

      return { completions };
    },
  );

  fastify.put(
    '/habits/:id/completions/:date',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = completionParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: params.error.issues,
        });
      }

      const result = await markCompletion(
        params.data.id,
        request.user.sub,
        params.data.date,
      );

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return { completion: result.completion };
    },
  );

  fastify.delete(
    '/habits/:id/completions/:date',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = completionParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: params.error.issues,
        });
      }

      const result = await unmarkCompletion(
        params.data.id,
        request.user.sub,
        params.data.date,
      );

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );
}
