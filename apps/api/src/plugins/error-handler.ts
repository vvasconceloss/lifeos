import fp from 'fastify-plugin';
import type { FastifyError, FastifyInstance } from 'fastify';
import { toErrorBody } from '../lib/errors';

export const errorHandlerPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request, reply) => {
    const err = error as FastifyError & { code?: string };

    if (err.validation) {
      return reply.status(400).send({
        error: toErrorBody('Validation failed', err.validation, 'VALIDATION_ERROR'),
      });
    }

    const statusCode = err.statusCode ?? 500;

    if (statusCode < 500) {
      request.log.warn({ err }, 'Request failed');
      return reply
        .status(statusCode)
        .send({ error: toErrorBody(err.message, undefined, err.code) });
    }

    request.log.error({ err }, 'Internal server error');
    return reply.status(500).send({ error: toErrorBody('Internal Server Error') });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({ error: toErrorBody('Not Found') });
  });
});
