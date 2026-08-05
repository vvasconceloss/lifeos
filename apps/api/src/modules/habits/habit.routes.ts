import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import { createHabitBodySchema, updateHabitBodySchema, idParamSchema, listHabitsQuerySchema } from './habit.schemas';
import { archiveHabit, createHabit, deleteHabit, getHabit, listHabits, updateHabit } from './habit.service';

export async function habitRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireAuth },
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
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const data = validateInput(createHabitBodySchema, request.body, reply);
      if (!data) return;

      const result = await createHabit(request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(201).send(result);
    },
  );

  fastify.get(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const habit = await getHabit(params.id, request.user.sub);

      if (!habit) {
        return reply.status(404).send({ error: 'Habit not found' });
      }

      return { habit };
    },
  );

  fastify.patch(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(updateHabitBodySchema, request.body, reply);
      if (!data) return;

      const result = await updateHabit(params.id, request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return { habit: result.habit };
    },
  );

  fastify.post(
    '/:id/archive',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await archiveHabit(params.id, request.user.sub);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return { habit: result.habit };
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await deleteHabit(params.id, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );
}
