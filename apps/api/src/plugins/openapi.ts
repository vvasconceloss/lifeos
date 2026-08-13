import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { openapi } from '../openapi';
import type { FastifyInstance } from 'fastify';

export const openapiPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(swagger, {
    mode: 'static',
    specification: {
      document: openapi as never,
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
  });
});
