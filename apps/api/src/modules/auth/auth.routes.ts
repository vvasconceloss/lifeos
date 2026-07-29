import { registerBodySchema, loginBodySchema } from './auth.schemas';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createUser, authenticate, getUserById, AUTH_ERRORS } from './auth.service';

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

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await getUserById(request.user.sub);

    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    return { user };
  });

  fastify.post('/register', async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const user = await createUser(parsed.data);
      const token = await setAuthCookie(reply, {
        sub: user.id,
        email: user.email,
      });

      return { user, token };
    } catch (error) {
      if (error instanceof Error && error.message === AUTH_ERRORS.EMAIL_ALREADY_EXISTS) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const user = await authenticate(parsed.data.email, parsed.data.password);
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
  });
}
