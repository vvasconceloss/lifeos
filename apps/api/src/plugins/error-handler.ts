import fp from 'fastify-plugin';
import type { FastifyError, FastifyInstance } from 'fastify';

export const errorHandlerPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request, reply) => {
    const err = error as FastifyError;

    if (err.validation) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: err.validation,
      });
    }

    const statusCode = err.statusCode ?? 500;

    if (statusCode < 500) {
      request.log.warn({ err }, 'Request failed');
      return reply.status(statusCode).send({ error: err.message });
    }

    request.log.error({ err }, 'Internal server error');
    return reply.status(500).send({ error: 'Internal Server Error' });
  });

  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({ error: 'Not Found' });
  });
});
