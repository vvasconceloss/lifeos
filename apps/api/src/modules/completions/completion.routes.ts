import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import { completionParamsSchema, listCompletionsQuerySchema } from './completion.schemas';
import { listCompletions, markCompletion, unmarkCompletion } from './completion.service';

export async function completionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/completions',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = validateInput(listCompletionsQuerySchema, request.query, reply);
      if (!query) return;

      const completions = await listCompletions(
        request.user.sub,
        query.from,
        query.to,
      );

      return { completions };
    },
  );

  fastify.put(
    '/habits/:id/completions/:date',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(completionParamsSchema, request.params, reply);
      if (!params) return;

      const result = await markCompletion(
        params.id,
        request.user.sub,
        params.date,
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
      const params = validateInput(completionParamsSchema, request.params, reply);
      if (!params) return;

      const result = await unmarkCompletion(
        params.id,
        request.user.sub,
        params.date,
      );

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );
}
