import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth';
import { createHabitBodySchema, updateHabitBodySchema, idParamSchema, listHabitsQuerySchema } from './habit.schemas';
import { archiveHabit, createHabit, deleteHabit, getHabit, listHabits, updateHabit } from './habit.service';

function parseId(request: { params: unknown }) {
  return idParamSchema.safeParse(request.params);
}

export async function habitRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = listHabitsQuerySchema.safeParse(request.query);

      if (!query.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: query.error.issues,
        });
      }

      const habits = await listHabits(
        request.user.sub,
        query.data.includeArchived === 'true',
      );

      return { habits };
    },
  );

  fastify.post(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = createHabitBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      const result = await createHabit(request.user.sub, parsed.data);

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
      const params = parseId(request);

      if (!params.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: params.error.issues,
        });
      }

      const habit = await getHabit(params.data.id, request.user.sub);

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
      const params = parseId(request);

      if (!params.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: params.error.issues,
        });
      }

      const parsed = updateHabitBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      const result = await updateHabit(params.data.id, request.user.sub, parsed.data);

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
      const params = parseId(request);

      if (!params.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: params.error.issues,
        });
      }

      const result = await archiveHabit(params.data.id, request.user.sub);

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
      const params = parseId(request);

      if (!params.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: params.error.issues,
        });
      }

      const result = await deleteHabit(params.data.id, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );
}
