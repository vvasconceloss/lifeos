import { toErrorBody } from '../../lib/errors';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireActive, requireVerified } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import { createGoalBodySchema, updateGoalBodySchema, idParamSchema } from './goal.schemas';
import {
  addHabitToGoal,
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  removeHabitFromGoal,
  updateGoal,
} from './goal.service';

const goalHabitParamsSchema = z.object({
  id: z.uuid(),
  habitId: z.uuid(),
});

export async function goalRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: [requireVerified, requireActive] },
    async (request) => {
      const goals = await listGoals(request.user.sub);
      return { goals };
    },
  );

  fastify.post(
    '/',
    { preHandler: [requireVerified, requireActive] },
    async (request, reply) => {
      const data = validateInput(createGoalBodySchema, request.body, reply);
      if (!data) return;

      const result = await createGoal(request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return reply.status(201).send({ goal: result.goal });
    },
  );

  fastify.get(
    '/:id',
    { preHandler: [requireVerified, requireActive] },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const goal = await getGoal(params.id, request.user.sub);

      if (!goal) {
        return reply.status(404).send({ error: toErrorBody('Goal not found') });
      }

      return { goal };
    },
  );

  fastify.patch(
    '/:id',
    { preHandler: [requireVerified, requireActive] },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(updateGoalBodySchema, request.body, reply);
      if (!data) return;

      const result = await updateGoal(params.id, request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return { goal: result.goal };
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: [requireVerified, requireActive] },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await deleteGoal(params.id, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return reply.status(204).send();
    },
  );

  fastify.put(
    '/:id/habits/:habitId',
    { preHandler: [requireVerified, requireActive] },
    async (request, reply) => {
      const params = validateInput(
        goalHabitParamsSchema,
        request.params,
        reply,
      );
      if (!params) return;

      const result = await addHabitToGoal(params.id, request.user.sub, params.habitId);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return result;
    },
  );

  fastify.delete(
    '/:id/habits/:habitId',
    { preHandler: [requireVerified, requireActive] },
    async (request, reply) => {
      const params = validateInput(
        goalHabitParamsSchema,
        request.params,
        reply,
      );
      if (!params) return;

      const result = await removeHabitFromGoal(params.id, request.user.sub, params.habitId);

      if ('error' in result) {
        return reply.status(result.status).send({ error: toErrorBody(result.error) });
      }

      return result;
    },
  );
}
