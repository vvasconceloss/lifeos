import { toErrorBody } from '../../lib/errors';
import { requireAuth, requireVerified } from '../../plugins/auth';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { validateInput } from '../../lib/validation';
import { changePasswordBodySchema, changeEmailRequestBodySchema, changeEmailConfirmBodySchema, changeEmailCancelBodySchema, deleteAccountBodySchema, recoverAccountBodySchema } from './account.schemas';
import { changePassword, requestEmailChange, confirmEmailChange, cancelEmailChange, cancelEmailChangeByToken, requestAccountDeletion, recoverAccount, cancelAccountDeletion, ACCOUNT_ERRORS } from './account.service';

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

function emailChangeConfirmUrl(token: string): string {
  return `${WEB_URL}/account/email/confirm?token=${encodeURIComponent(token)}`;
}

function emailChangeCancelUrl(token: string): string {
  return `${WEB_URL}/account/email/cancel?token=${encodeURIComponent(token)}`;
}

export async function accountRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/change-password',
    { preHandler: requireAuth },
    async (request, reply) => {
      const data = validateInput(changePasswordBodySchema, request.body, reply);
      if (!data) return;

      try {
        await changePassword(request.user.sub, data.currentPassword, data.newPassword);
      } catch (error) {
        if (error instanceof Error && error.message === ACCOUNT_ERRORS.INCORRECT_PASSWORD) {
          return reply.status(400).send({ error: toErrorBody(error.message, undefined, 'INCORRECT_PASSWORD') });
        }
        if (error instanceof Error && error.message === ACCOUNT_ERRORS.SAME_PASSWORD) {
          return reply.status(400).send({ error: toErrorBody(error.message, undefined, 'SAME_PASSWORD') });
        }
        throw error;
      }

      // Re-issue a fresh JWT for the current session so it survives the change;
      // every other session (issued before passwordChangedAt) is now invalid.
      await issueSessionCookie(reply, request.user.sub, request.user.email);

      // Security notification — even if the user made the request themselves.
      await fastify.emailService.send({
        to: request.user.email,
        template: 'password-changed',
        data: {},
      });

      return { message: 'Password updated.' };
    },
  );

  fastify.post(
    '/change-email/request',
    { preHandler: requireVerified },
    async (request, reply) => {
      const data = validateInput(changeEmailRequestBodySchema, request.body, reply);
      if (!data) return;

      let result;
      try {
        result = await requestEmailChange(request.user.sub, data.currentPassword, data.newEmail);
      } catch (error) {
        if (error instanceof Error && error.message === ACCOUNT_ERRORS.INCORRECT_PASSWORD) {
          return reply.status(400).send({ error: toErrorBody(error.message, undefined, 'INCORRECT_PASSWORD') });
        }
        if (error instanceof Error && error.message === ACCOUNT_ERRORS.NEW_EMAIL_SAME) {
          return reply.status(400).send({ error: toErrorBody(error.message, undefined, 'NEW_EMAIL_SAME') });
        }
        throw error;
      }

      // If the email is already in use we send nothing and respond generically
      // (no mass-enumeration side channel via this authenticated endpoint).
      if (result.status === 'requested') {
        await fastify.emailService.send({
          to: data.newEmail,
          template: 'email-change-request',
          data: { confirmUrl: emailChangeConfirmUrl(result.confirmToken) },
        });
        await fastify.emailService.send({
          to: request.user.email,
          template: 'email-change-alert',
          data: { cancelUrl: emailChangeCancelUrl(result.cancelToken) },
        });
      }

      return {
        message: "If the request is valid, you'll receive a confirmation email.",
      };
    },
  );

  fastify.post('/change-email/confirm', async (request, reply) => {
    const data = validateInput(changeEmailConfirmBodySchema, request.body, reply);
    if (!data) return;

    const result = await confirmEmailChange(data.token);

    switch (result.status) {
      case 'confirmed': {
        // The email changed, so any session tied to the old address must be
        // cleared — force a fresh login with the new credentials.
        reply.clearCookie('token', { path: '/' });

        // Final confirmation to the new address, plus a security notice to the old one.
        await fastify.emailService.send({
          to: result.email,
          template: 'email-changed',
          data: {},
        });
        await fastify.emailService.send({
          to: result.previousEmail,
          template: 'email-changed',
          data: {},
        });
        return { message: 'Email address updated.' };
      }
      case 'expired':
        return reply.status(400).send({
          error: toErrorBody('Confirmation link has expired', undefined, 'EMAIL_CHANGE_EXPIRED'),
        });
      default:
        return reply.status(400).send({
          error: toErrorBody('Invalid or used confirmation link', undefined, 'INVALID_EMAIL_CHANGE_TOKEN'),
        });
    }
  });

  fastify.delete('/change-email/cancel', { preHandler: requireAuth }, async (request) => {
    await cancelEmailChange(request.user.sub);
    return { message: 'Pending email change cancelled.' };
  });

  // Cancellation via the link sent to the old email (no login required).
  fastify.post('/change-email/cancel', async (request, reply) => {
    const data = validateInput(changeEmailCancelBodySchema, request.body, reply);
    if (!data) return;

    await cancelEmailChangeByToken(data.token);
    return { message: 'Pending email change cancelled.' };
  });

  fastify.post(
    '/delete',
    { preHandler: requireVerified },
    async (request, reply) => {
      const data = validateInput(deleteAccountBodySchema, request.body, reply);
      if (!data) return;

      let result;
      try {
        result = await requestAccountDeletion(request.user.sub, data.currentPassword);
      } catch (error) {
        if (error instanceof Error && error.message === ACCOUNT_ERRORS.INCORRECT_PASSWORD) {
          return reply.status(400).send({ error: toErrorBody(error.message, undefined, 'INCORRECT_PASSWORD') });
        }
        if (error instanceof Error && error.message === ACCOUNT_ERRORS.ALREADY_PENDING_DELETION) {
          return reply.status(409).send({ error: toErrorBody(error.message, undefined, 'ALREADY_PENDING_DELETION') });
        }
        throw error;
      }

      // Confirmation email with a single-use recovery link.
      await fastify.emailService.send({
        to: request.user.email,
        template: 'account-deletion-requested',
        data: {
          recoveryUrl: accountRecoveryUrl(result.recoveryToken),
          deletionDate: result.scheduledDeletionAt.toISOString().slice(0, 10),
        },
      });

      // All active sessions are invalidated — force a fresh login for any action.
      reply.clearCookie('token', { path: '/' });

      return { message: 'Account deletion scheduled. You can recover it within 15 days.' };
    },
  );

  // Path A — recovery via the email link (no login required).
  fastify.post('/recover', async (request, reply) => {
    const data = validateInput(recoverAccountBodySchema, request.body, reply);
    if (!data) return;

    const result = await recoverAccount(data.token);

    switch (result.status) {
      case 'recovered':
        return { message: 'Account recovered.' };
      case 'expired':
        return reply.status(400).send({
          error: toErrorBody('Recovery link has expired', undefined, 'RECOVERY_EXPIRED'),
        });
      default:
        return reply.status(400).send({
          error: toErrorBody('Invalid or used recovery link', undefined, 'INVALID_RECOVERY_TOKEN'),
        });
    }
  });

  // Path B — recovery while authenticated (from the post-login recovery screen).
  fastify.post('/cancel-deletion', { preHandler: requireAuth }, async (request) => {
    await cancelAccountDeletion(request.user.sub);
    return { message: 'Account deletion cancelled.' };
  });
}

function accountRecoveryUrl(token: string): string {
  return `${WEB_URL}/account/recover?token=${encodeURIComponent(token)}`;
}

async function issueSessionCookie(
  reply: FastifyReply,
  sub: string,
  email: string,
): Promise<string> {
  const token = await reply.jwtSign({ sub, email }, { expiresIn: `${SESSION_TTL_DAYS}d` });
  reply.setCookie('token', token, cookieOptions);
  return token;
}
