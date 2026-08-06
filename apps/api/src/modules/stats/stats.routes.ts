import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import { idParamSchema, statsQuerySchema, analyticsQuerySchema } from './stats.schemas';
import { getAnalytics, getHabitStats, getHeatmap, getMonthlyStats, getOverview } from './stats.service';

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/stats/analytics',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = validateInput(analyticsQuerySchema, request.query, reply);
      if (!query) return;

      const stats = await getAnalytics(request.user.sub, query.weeks ?? 12);

      return { stats };
    },
  );

  fastify.get(
    '/stats/heatmap',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = validateInput(statsQuerySchema, request.query, reply);
      if (!query) return;

      const now = new Date();
      const stats = await getHeatmap(
        request.user.sub,
        query.year ?? now.getUTCFullYear(),
        query.month ?? null,
      );

      return { stats };
    },
  );

  fastify.get(
    '/stats/monthly',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = validateInput(statsQuerySchema, request.query, reply);
      if (!query) return;

      const now = new Date();
      const stats = await getMonthlyStats(
        request.user.sub,
        query.year ?? now.getUTCFullYear(),
        query.month ?? now.getUTCMonth() + 1,
      );

      return { stats };
    },
  );

  fastify.get(
    '/stats/overview',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = validateInput(statsQuerySchema, request.query, reply);
      if (!query) return;

      const now = new Date();
      const stats = await getOverview(
        request.user.sub,
        query.year ?? now.getUTCFullYear(),
        query.month ?? now.getUTCMonth() + 1,
      );

      return { stats };
    },
  );

  fastify.get(
    '/stats/habits/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const query = validateInput(statsQuerySchema, request.query, reply);
      if (!query) return;

      const now = new Date();
      const stats = await getHabitStats(
        params.id,
        request.user.sub,
        query.year ?? now.getUTCFullYear(),
        query.month ?? now.getUTCMonth() + 1,
      );

      if (!stats) {
        return reply.status(404).send({ error: 'Habit not found' });
      }

      return { stats };
    },
  );
}
