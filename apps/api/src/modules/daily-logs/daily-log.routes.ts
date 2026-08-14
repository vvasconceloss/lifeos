import { toErrorBody } from '../../lib/errors';
import type { FastifyInstance } from 'fastify';
import { requireVerified } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import { createDailyLogBodySchema, dailyLogDateParamSchema, idParamSchema, updateDailyLogBodySchema } from './daily-log.schemas';
import { listCompletionsQuerySchema } from '../completions/completion.schemas';
import {
  deleteDailyLog,
  getCorrelations,
  getDailyLogByDate,
  listDailyLogs,
  updateDailyLog,
  upsertDailyLog,
} from './daily-log.service';

export async function dailyLogRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireVerified },
    async (request, reply) => {
      const query = validateInput(listCompletionsQuerySchema, request.query, reply);
      if (!query) return;

      const logs = await listDailyLogs(request.user.sub, query.from, query.to);

      return { logs };
    },
  );

  fastify.post(
    '/',
    { preHandler: requireVerified },
    async (request, reply) => {
      const data = validateInput(createDailyLogBodySchema, request.body, reply);
      if (!data) return;

      const result = await upsertDailyLog(request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return { log: result.log };
    },
  );

  fastify.get(
    '/correlations',
    { preHandler: requireVerified },
    async (request, reply) => {
      const query = validateInput(listCompletionsQuerySchema, request.query, reply);
      if (!query) return;

      const correlations = await getCorrelations(request.user.sub, query.from, query.to);

      return { correlations };
    },
  );

  fastify.get(
    '/:date',
    { preHandler: requireVerified },
    async (request, reply) => {
      const params = validateInput(dailyLogDateParamSchema, request.params, reply);
      if (!params) return;

      const log = await getDailyLogByDate(request.user.sub, params.date);

      if (!log) {
        return reply.status(404).send({ error: toErrorBody('Daily log not found') });
      }

      return { log };
    },
  );

  fastify.patch(
    '/:id',
    { preHandler: requireVerified },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(updateDailyLogBodySchema, request.body, reply);
      if (!data) return;

      const result = await updateDailyLog(params.id, request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return { log: result.log };
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: requireVerified },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await deleteDailyLog(params.id, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return reply.status(204).send();
    },
  );
}
