import 'dotenv/config';
import { jwtPlugin } from './plugins/jwt';
import { corsPlugin } from './plugins/cors';
import { csrfPlugin } from './plugins/csrf';
import { cookiesPlugin } from './plugins/cookie';
import { systemRoutes } from './routes/system.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { pillarRoutes } from './modules/pillars/pillar.routes';

import Fastify, { type FastifyInstance } from 'fastify';

export async function buildApp(opts?: { csrf?: boolean }): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true
  });

  await fastify.register(cookiesPlugin);

  if (opts?.csrf !== false) {
    await fastify.register(csrfPlugin);
  }

  await fastify.register(jwtPlugin);
  await fastify.register(corsPlugin);

  await fastify.register(systemRoutes, { prefix: '/v1' });
  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(pillarRoutes, { prefix: '/v1/pillars' });

  return fastify;
}
