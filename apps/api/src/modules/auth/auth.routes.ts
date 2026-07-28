import type { FastifyInstance } from 'fastify';
import { registerBodySchema } from './auth.schemas';
import { createUser, AUTH_ERRORS } from './auth.service';

export async function authRoutes(fastify: FastifyInstance) {
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
      const token = await reply.jwtSign({
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
}
