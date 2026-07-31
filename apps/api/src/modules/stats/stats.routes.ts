import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { getHabitStats, getHeatmap, getMonthlyStats, getOverview, getPillarStats } from './stats.service';

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/stats/heatmap',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { year, month } = request.query as {
        year?: string;
        month?: string;
      };

      const now = new Date();
      const stats = await getHeatmap(
        request.user.sub,
        year ? parseInt(year) : now.getUTCFullYear(),
        month ? parseInt(month) : null,
      );

      return stats;
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

  fastify.get(
    '/stats/overview',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { year, month } = request.query as {
        year?: string;
        month?: string;
      };

      const now = new Date();
      const stats = await getOverview(
        request.user.sub,
        year ? parseInt(year) : now.getUTCFullYear(),
        month ? parseInt(month) : now.getUTCMonth() + 1,
      );

      return stats;
    },
  );

  fastify.get(
    '/stats/habits/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { year, month } = request.query as {
        year?: string;
        month?: string;
      };

      const now = new Date();
      const stats = await getHabitStats(
        id,
        request.user.sub,
        year ? parseInt(year) : now.getUTCFullYear(),
        month ? parseInt(month) : now.getUTCMonth() + 1,
      );

      if (!stats) {
        return reply.status(404).send({ error: 'Habit not found' });
      }

      return { stats };
    },
  );
}
