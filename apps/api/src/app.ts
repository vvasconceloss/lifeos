import { corsPlugin } from './plugins/cors';
import { systemRoutes } from './routes/system.routes';
import Fastify, { type FastifyInstance } from 'fastify';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true
  });

  await fastify.register(corsPlugin);
  await fastify.register(systemRoutes, { prefix: '/v1' });

  return fastify;
}
