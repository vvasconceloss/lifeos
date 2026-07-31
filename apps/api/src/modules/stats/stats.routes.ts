import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { idParamSchema, statsQuerySchema } from './stats.schemas';
import { getHabitStats, getHeatmap, getMonthlyStats, getOverview, getPillarStats } from './stats.service';

function parseQuery(request: { query: unknown }) {
  return statsQuerySchema.safeParse(request.query);
}

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/stats/heatmap',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = parseQuery(request);

      if (!query.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: query.error.issues,
        });
      }

      const now = new Date();
      const stats = await getHeatmap(
        request.user.sub,
        query.data.year ?? now.getUTCFullYear(),
        query.data.month ?? null,
      );

      return stats;
    },
  );

  fastify.get(
    '/stats/monthly',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = parseQuery(request);

      if (!query.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: query.error.issues,
        });
      }

      const now = new Date();
      const stats = await getMonthlyStats(
        request.user.sub,
        query.data.year ?? now.getUTCFullYear(),
        query.data.month ?? now.getUTCMonth() + 1,
      );

      return stats;
    },
  );

  fastify.get(
    '/stats/overview',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = parseQuery(request);

      if (!query.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: query.error.issues,
        });
      }

      const now = new Date();
      const stats = await getOverview(
        request.user.sub,
        query.data.year ?? now.getUTCFullYear(),
        query.data.month ?? now.getUTCMonth() + 1,
      );

      return stats;
    },
  );

  fastify.get(
    '/stats/habits/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);

      if (!params.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: params.error.issues,
        });
      }

      const query = parseQuery(request);

      if (!query.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: query.error.issues,
        });
      }

      const now = new Date();
      const stats = await getHabitStats(
        params.data.id,
        request.user.sub,
        query.data.year ?? now.getUTCFullYear(),
        query.data.month ?? now.getUTCMonth() + 1,
      );

      if (!stats) {
        return reply.status(404).send({ error: 'Habit not found' });
      }

      return { stats };
    },
  );
}
