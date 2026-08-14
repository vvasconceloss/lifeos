import { toErrorBody } from '../../lib/errors';
import { requireAuth } from '../../plugins/auth';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { validateInput } from '../../lib/validation';
import { onboardingBodySchema, registerBodySchema, loginBodySchema, updateMeBodySchema, verifyEmailBodySchema, resendVerificationBodySchema, forgotPasswordBodySchema, resetPasswordBodySchema } from './auth.schemas';
import { createUser, authenticate, getUserById, updateUser, verifyEmail, resendVerification, forgotPassword, resetPassword, DEMO_EMAIL, AUTH_ERRORS } from './auth.service';
import { completeOnboarding } from './onboarding.service';
import { seedDemoUser, getDemoUserResponse } from './demo.service';

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};

async function setAuthCookie(
  reply: FastifyReply,
  payload: { sub: string; email: string },
): Promise<string> {
  const token = await reply.jwtSign(payload, { expiresIn: `${SESSION_TTL_DAYS}d` });
  reply.setCookie('token', token, cookieOptions);
  return token;
}

function verificationUrl(token: string, redirect?: string): string {
  const base = `${WEB_URL}/verify-email?token=${encodeURIComponent(token)}`;
  // Only allow internal paths (validated by the shared schema) to avoid open redirects.
  return redirect && redirect.startsWith("/") && !redirect.startsWith("//")
    ? `${base}&redirect=${encodeURIComponent(redirect)}`
    : base;
}

function resetUrl(token: string): string {
  return `${WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = await getUserById(request.user.sub);

    if (!user) {
      return reply.status(401).send({ error: toErrorBody('User not found') });
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
      return reply.status(result.status).send({ error: toErrorBody(result.error) });
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

        const sessionToken = await setAuthCookie(reply, {
          sub: user.id,
          email: user.email,
        });

        return reply.status(201).send({ user, token: sessionToken });
      } catch (error) {
        if (error instanceof Error && error.message === AUTH_ERRORS.EMAIL_ALREADY_EXISTS) {
          return reply.status(409).send({ error: toErrorBody(error.message) });
        }
        throw error;
      }
    },
  );

  fastify.post('/verify-email', async (request, reply) => {
    const data = validateInput(verifyEmailBodySchema, request.body, reply);
    if (!data) return;

    const result = await verifyEmail(data.token);

    switch (result.status) {
      case 'verified':
        return { emailVerified: true };
      case 'already-verified':
        return { emailVerified: true };
      case 'expired':
        return reply.status(400).send({
          error: toErrorBody('Verification link has expired', undefined, 'VERIFICATION_EXPIRED'),
        });
      default:
        return reply.status(400).send({
          error: toErrorBody('Invalid or expired verification link', undefined, 'INVALID_VERIFICATION_TOKEN'),
        });
    }
  });

  fastify.post(
    '/resend-verification',
    {
      config: {
        rateLimit: {
          max: Number(process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX ?? 3),
          timeWindow: process.env.RESEND_VERIFICATION_RATE_LIMIT_WINDOW ?? '1 hour',
        },
      },
    },
    async (request, reply) => {
      const data = validateInput(resendVerificationBodySchema, request.body, reply);
      if (!data) return;

      // Anti-enumeration: always send the same generic message, regardless of
      // whether the email exists or is already verified.
      await resendVerification(data.email, async (token, email) => {
        await fastify.emailService.send({
          to: email,
          template: 'verify-email',
          data: { verificationUrl: verificationUrl(token, data.redirect) },
        });
      });

      return {
        message:
          'If an account with that email exists and is not yet verified, a new verification email has been sent.',
      };
    },
  );

  fastify.post(
    '/forgot-password',
    {
      config: {
        rateLimit: {
          max: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX ?? 3),
          timeWindow: process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW ?? '1 hour',
        },
      },
    },
    async (request, reply) => {
      const data = validateInput(forgotPasswordBodySchema, request.body, reply);
      if (!data) return;

      // Anti-enumeration: always the same message + consistent response time.
      await forgotPassword(data.email, async (token, email) => {
        await fastify.emailService.send({
          to: email,
          template: 'password-reset',
          data: { resetUrl: resetUrl(token) },
        });
      });

      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    },
  );

  fastify.post(
    '/reset-password',
    {
      config: {
        rateLimit: {
          max: Number(process.env.RESET_PASSWORD_RATE_LIMIT_MAX ?? 10),
          timeWindow: process.env.RESET_PASSWORD_RATE_LIMIT_WINDOW ?? '1 hour',
        },
      },
    },
    async (request, reply) => {
      const data = validateInput(resetPasswordBodySchema, request.body, reply);
      if (!data) return;

      const result = await resetPassword(data.token, data.password);

      if (result.status === 'invalid') {
        return reply.status(400).send({
          error: toErrorBody('Invalid or expired reset link', undefined, 'INVALID_RESET_TOKEN'),
        });
      }

      if (result.status === 'expired') {
        return reply.status(400).send({
          error: toErrorBody('Reset link has expired', undefined, 'RESET_EXPIRED'),
        });
      }

      // Security notification — even if the user made the request themselves.
      await fastify.emailService.send({
        to: result.email,
        template: 'password-changed',
        data: {},
      });

      return { message: 'Your password has been reset. You can now sign in.' };
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
          return reply.status(401).send({ error: toErrorBody(error.message) });
        }
        throw error;
      }
    },
  );
}
