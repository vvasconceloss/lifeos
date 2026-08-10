import { requireAuth } from '../../plugins/auth';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { validateInput } from '../../lib/validation';
import { onboardingBodySchema, registerBodySchema, loginBodySchema, updateMeBodySchema } from './auth.schemas';
import { createUser, authenticate, getUserById, updateUser, DEMO_EMAIL, AUTH_ERRORS } from './auth.service';
import { completeOnboarding } from './onboarding.service';
import { seedDemoUser, getDemoUserResponse } from './demo.service';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

async function setAuthCookie(
  reply: FastifyReply,
  payload: { sub: string; email: string },
): Promise<string> {
  const token = await reply.jwtSign(payload);
  reply.setCookie('token', token, cookieOptions);
  return token;
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await getUserById(request.user.sub);

    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    return { user };
  });

  fastify.patch('/me', { preHandler: requireAuth }, async (request, reply) => {
    const data = validateInput(updateMeBodySchema, request.body, reply);
    if (!data) return;

    const user = await updateUser(request.user.sub, data);

    return { user };
  });

  fastify.post('/onboarding', { preHandler: requireAuth }, async (request, reply) => {
    const data = validateInput(onboardingBodySchema, request.body, reply);
    if (!data) return;

    const result = await completeOnboarding(request.user.sub, data);

    if ('error' in result) {
      return reply.status(result.status).send({ error: result.error });
    }

    return reply.status(201).send(result);
  });

  fastify.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: Number(process.env.REGISTER_RATE_LIMIT_MAX ?? 10),
          timeWindow: process.env.REGISTER_RATE_LIMIT_WINDOW ?? '1 minute',
        },
      },
    },
    async (request, reply) => {
      const data = validateInput(registerBodySchema, request.body, reply);
      if (!data) return;

      try {
        const user = await createUser(data);
        const token = await setAuthCookie(reply, {
          sub: user.id,
          email: user.email,
        });

        return reply.status(201).send({ user, token });
      } catch (error) {
        if (error instanceof Error && error.message === AUTH_ERRORS.EMAIL_ALREADY_EXISTS) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  fastify.post(
    '/demo',
    {
      config: {
        rateLimit: {
          max: Number(process.env.DEMO_RATE_LIMIT_MAX ?? 10),
          timeWindow: process.env.DEMO_RATE_LIMIT_WINDOW ?? '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { id } = await seedDemoUser();
      const token = await setAuthCookie(reply, { sub: id, email: DEMO_EMAIL });
      const user = await getDemoUserResponse();

      return reply.status(200).send({ user, token });
    },
  );

  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5),
          timeWindow: process.env.LOGIN_RATE_LIMIT_WINDOW ?? '1 minute',
        },
      },
    },
    async (request, reply) => {
      const data = validateInput(loginBodySchema, request.body, reply);
      if (!data) return;

      try {
        const user = await authenticate(data.email, data.password);
        const token = await setAuthCookie(reply, {
          sub: user.id,
          email: user.email,
        });

        return { user, token };
      } catch (error) {
        if (error instanceof Error && error.message === AUTH_ERRORS.INVALID_CREDENTIALS) {
          return reply.status(401).send({ error: error.message });
        }
        throw error;
      }
    },
  );
}
