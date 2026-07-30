import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { getMonthlyStats, listCompletions, markCompletion, unmarkCompletion } from './completion.service';

export async function completionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/completions',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { from, to } = request.query as {
        from?: string;
        to?: string;
      };

      const completions = await listCompletions(
        request.user.sub,
        from,
        to,
      );

      return { completions };
    },
  );

  fastify.get(
    '/stats/monthly',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { year, month } = request.query as {
        year?: string;
        month?: string;
      };

      const now = new Date();
      const stats = await getMonthlyStats(
        request.user.sub,
        year ? parseInt(year) : now.getUTCFullYear(),
        month ? parseInt(month) : now.getUTCMonth() + 1,
      );

      return stats;
    },
  );

  fastify.put(
    '/habits/:id/completions/:date',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id, date } = request.params as {
        id: string;
        date: string;
      };

      const result = await markCompletion(id, request.user.sub, date);

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
      const { id, date } = request.params as {
        id: string;
        date: string;
      };

      const result = await unmarkCompletion(id, request.user.sub, date);

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );
}
