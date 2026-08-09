import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../plugins/auth';
import { validateInput } from '../../lib/validation';
import {
  createProjectBodySchema,
  updateProjectBodySchema,
  createProjectTaskBodySchema,
  updateProjectTaskBodySchema,
  projectTaskReorderBodySchema,
  idParamSchema,
} from './project.schemas';
import {
  addProjectTask,
  createProject,
  deleteProject,
  deleteProjectTask,
  getProject,
  listProjects,
  reorderProjectTasks,
  updateProject,
  updateProjectTask,
} from './project.service';

const taskIdParamSchema = z.object({
  taskId: z.uuid(),
});

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: requireAuth },
    async (request) => {
      const projects = await listProjects(request.user.sub);
      return { projects };
    },
  );

  fastify.post(
    '/',
    { preHandler: requireAuth },
    async (request, reply) => {
      const data = validateInput(createProjectBodySchema, request.body, reply);
      if (!data) return;

      const result = await createProject(request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(201).send({ project: result.project });
    },
  );

  fastify.get(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const project = await getProject(params.id, request.user.sub);

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      return { project };
    },
  );

  fastify.patch(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(updateProjectBodySchema, request.body, reply);
      if (!data) return;

      const result = await updateProject(params.id, request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return { project: result.project };
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const result = await deleteProject(params.id, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );

  fastify.post(
    '/:id/tasks',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(createProjectTaskBodySchema, request.body, reply);
      if (!data) return;

      const result = await addProjectTask(params.id, request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(201).send({ task: result.task });
    },
  );

  fastify.post(
    '/:id/tasks/reorder',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(idParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(projectTaskReorderBodySchema, request.body, reply);
      if (!data) return;

      const result = await reorderProjectTasks(params.id, request.user.sub, data.ids);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return result;
    },
  );

  fastify.patch(
    '/tasks/:taskId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(taskIdParamSchema, request.params, reply);
      if (!params) return;

      const data = validateInput(updateProjectTaskBodySchema, request.body, reply);
      if (!data) return;

      const result = await updateProjectTask(params.taskId, request.user.sub, data);

      if ('error' in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return { task: result.task };
    },
  );

  fastify.delete(
    '/tasks/:taskId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = validateInput(taskIdParamSchema, request.params, reply);
      if (!params) return;

      const result = await deleteProjectTask(params.taskId, request.user.sub);

      if (result !== true) {
        return reply.status(result.status).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  );
}
