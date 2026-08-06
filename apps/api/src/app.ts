import 'dotenv/config';
import { jwtPlugin } from './plugins/jwt';
import { corsPlugin } from './plugins/cors';
import { csrfPlugin } from './plugins/csrf';
import { cookiesPlugin } from './plugins/cookie';
import { rateLimitPlugin } from './plugins/rate-limit';
import { helmetPlugin } from './plugins/helmet';
import { errorHandlerPlugin } from './plugins/error-handler';
import { systemRoutes } from './routes/system.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { pillarRoutes } from './modules/pillars/pillar.routes';
import { habitRoutes } from './modules/habits/habit.routes';
import { completionRoutes } from './modules/completions/completion.routes';
import { statsRoutes } from './modules/stats/stats.routes';
import { goalRoutes } from './modules/goals/goal.routes';
import { dailyLogRoutes } from './modules/daily-logs/daily-log.routes';

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
  await fastify.register(rateLimitPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(errorHandlerPlugin);

  await fastify.register(systemRoutes, { prefix: '/v1' });
  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(pillarRoutes, { prefix: '/v1/pillars' });
  await fastify.register(habitRoutes, { prefix: '/v1/habits' });
  await fastify.register(completionRoutes, { prefix: '/v1' });
  await fastify.register(statsRoutes, { prefix: '/v1' });
  await fastify.register(goalRoutes, { prefix: '/v1/goals' });
  await fastify.register(dailyLogRoutes, { prefix: '/v1/daily-logs' });

  return fastify;
}
