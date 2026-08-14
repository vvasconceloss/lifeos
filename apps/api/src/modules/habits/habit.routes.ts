import { toErrorBody } from '../../lib/errors';
import type { FastifyInstance } from 'fastify';
import { requireActive } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import { createHabitBodySchema, updateHabitBodySchema, idParamSchema, listHabitsQuerySchema, habitReorderBodySchema } from './habit.schemas';
import { listCompletionsQuerySchema } from '../completions/completion.schemas';
import { archiveHabit, createHabit, deleteHabit, getHabit, getHabitHistory, listHabits, reorderHabits, updateHabit } from './habit.service';

export async function habitRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireActive },
    async (request, reply) => {
      const query = validateInput(listHabitsQuerySchema, request.query, reply);
      if (!query) return;

      const habits = await listHabits(
        request.user.sub,
        query.includeArchived === 'true',
      );

      return { habits };
    },
  );

  fastify.post(
    '/reorder',
    { preHandler: requireActive },
    async (request, reply) => {
      const data = validateInput(habitReorderBodySchema, request.body, reply);
      if (!data) return;

      const result = await reorderHabits(request.user.sub, data.ids);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return result;
    },
  );

  fastify.get(
    '/:id/history',
    { preHandler: requireActive },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const query = validateInput(listCompletionsQuerySchema, request.query, reply);
      if (!query) return;

      const history = await getHabitHistory(
        params.id,
        request.user.sub,
        query.from,
        query.to,
      );

      if (!history) {
        return reply.status(404).send({ error: toErrorBody('Habit not found') });
      }

      return { history };
    },
  );

  fastify.post(
    '/',
    { preHandler: requireActive },
    async (request, reply) => {
      const data = validateInput(createHabitBodySchema, request.body, reply);
      if (!data) return;

      const result = await createHabit(request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return reply.status(201).send(result);
    },
  );

  fastify.get(
    '/:id',
    { preHandler: requireActive },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const habit = await getHabit(params.id, request.user.sub);

      if (!habit) {
        return reply.status(404).send({ error: toErrorBody('Habit not found') });
      }

      return { habit };
    },
  );

  fastify.patch(
    '/:id',
    { preHandler: requireActive },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(updateHabitBodySchema, request.body, reply);
      if (!data) return;

      const result = await updateHabit(params.id, request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return { habit: result.habit };
    },
  );

  fastify.post(
    '/:id/archive',
    { preHandler: requireActive },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await archiveHabit(params.id, request.user.sub);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return { habit: result.habit };
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: requireActive },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await deleteHabit(params.id, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return reply.status(204).send();
    },
  );
}
