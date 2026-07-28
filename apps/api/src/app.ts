import 'dotenv/config';
import { jwtPlugin } from './plugins/jwt';
import { corsPlugin } from './plugins/cors';
import { csrfPlugin } from './plugins/csrf';
import { cookiesPlugin } from './plugins/cookie';
import { systemRoutes } from './routes/system.routes';
import Fastify, { type FastifyInstance } from 'fastify';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true
  });

  await fastify.register(jwtPlugin);
  await fastify.register(corsPlugin);
  await fastify.register(csrfPlugin);
  await fastify.register(cookiesPlugin);

  await fastify.register(systemRoutes, { prefix: '/v1' });

  return fastify;
}
