import { buildApp } from '../../app';
import { cleanupTestUsers, uniqueEmail } from '../../../test/helpers';
import { prisma } from '../../db/client';
import type { EmailService } from '../../lib/email';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function makeEmailService() {
  const sends: Array<{ to: string; template: string; data: Record<string, unknown> }> = [];
  const service: EmailService = {
    async send(input) {
      sends.push({ to: input.to, template: input.template, data: input.data });
    },
  };
  return { sends, service };
}

async function buildWithEmail() {
  const { sends, service } = makeEmailService();
  const app = await buildApp({ csrf: false, emailService: service });
  return { app, sends };
}

async function register(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password: 'Test1234!' },
  });
}

/** Requests a reset link and returns the plaintext token from the send. */
async function requestReset(
  app: Awaited<ReturnType<typeof buildApp>>,
  sends: ReturnType<typeof makeEmailService>['sends'],
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/forgot-password',
    payload: { email },
  });
  expect(res.statusCode).toBe(200);
  const resetSend = sends.filter((s) => s.template === 'password-reset').at(-1)!;
  return decodeURIComponent(String(resetSend.data.resetUrl).split('token=')[1]!);
}

describe('POST /v1/auth/forgot-password', () => {
  it('sends a reset link for a registered email (generic response)', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('a password reset link has been sent');

    const resetSend = sends.find((s) => s.template === 'password-reset');
    expect(resetSend).toBeTruthy();
    expect(resetSend!.to).toBe(email);
    expect(String(resetSend!.data.resetUrl)).toContain('/reset-password?token=');

    await app.close();
  });

  it('does not reveal whether an unregistered email exists', async () => {
    const { app, sends } = await buildWithEmail();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email: uniqueEmail() },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('a password reset link has been sent');
    expect(sends).toHaveLength(0);

    await app.close();
  });

  it('stores only the token hash with a 1-hour expiry', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    await requestReset(app, sends, email);

    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user!.id },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    // 1 hour TTL.
    const ttl = tokens[0]!.expiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(59 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(60 * 60 * 1000);

    await app.close();
  });

  it('requesting again invalidates the previous reset token', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);

    const oldToken = await requestReset(app, sends, email);

    await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email },
    });

    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user!.id },
    });
    expect(tokens).toHaveLength(1);

    // Old token no longer works.
    const oldRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token: oldToken, password: 'NewPass123!' },
    });
    expect(oldRes.statusCode).toBe(400);

    await app.close();
  });

  it('does not send a reset for the demo account but responds identically', async () => {
    const { app, sends } = await buildWithEmail();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email: 'demo@lifeos.com' },
    });

    expect(res.statusCode).toBe(200);
    expect(sends).toHaveLength(0);

    await app.close();
  });
});

describe('POST /v1/auth/reset-password', () => {
  it('resets the password with a valid token and sends a security notification', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestReset(app, sends, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, password: 'NewPass123!' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('password has been reset');

    // Old password no longer works, new one does.
    const loginOld = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'Test1234!' },
    });
    const loginNew = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'NewPass123!' },
    });
    expect(loginOld.statusCode).toBe(401);
    expect(loginNew.statusCode).toBe(200);

    // Security notification email was sent.
    const notify = sends.find((s) => s.template === 'password-changed');
    expect(notify).toBeTruthy();
    expect(notify!.to).toBe(email);

    // Token is single-use.
    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user!.id },
    });
    expect(tokens).toHaveLength(0);

    await app.close();
  });

  it('rejects an invalid or nonexistent token', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token: 'not-a-token', password: 'NewPass123!' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_RESET_TOKEN');

    await app.close();
  });

  it('rejects a reused token after a successful reset', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestReset(app, sends, email);

    await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, password: 'NewPass123!' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, password: 'Another123!' },
    });

    expect(second.statusCode).toBe(400);
    expect(second.json().error.code).toBe('INVALID_RESET_TOKEN');

    await app.close();
  });

  it('rejects an expired token', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestReset(app, sends, email);

    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.passwordResetToken.updateMany({
      where: { userId: user!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, password: 'NewPass123!' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('RESET_EXPIRED');

    await app.close();
  });

  it('rejects a weak new password (Phase 1 policy)', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestReset(app, sends, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, password: 'weak' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('invalidates old JWTs after a reset', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestReset(app, sends, email);

    // A valid session cookie from before the reset.
    const cookieRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'Test1234!' },
    });
    const cookie = cookieRes.cookies.find((c) => c.name === 'token')!;

    // Confirm the old session works before the reset.
    const before = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { cookie: `token=${cookie.value}` },
    });
    expect(before.statusCode).toBe(200);

    // Ensure the login happened on a different second than the reset, so the
    // old token's `iat` is strictly before `passwordChangedAt` (second resolution).
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, password: 'NewPass123!' },
    });

    // The old session is now rejected.
    const after = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { cookie: `token=${cookie.value}` },
    });
    expect(after.statusCode).toBe(401);

    await app.close();
  });
});

describe('rate limiting', () => {
  it('limits forgot-password requests', async () => {
    const previousMax = process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX;
    process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX = '3';

    const { app } = await buildWithEmail();

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        payload: { email: uniqueEmail() },
      });
      statuses.push(res.statusCode);
    }

    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses[3]).toBe(429);

    await app.close();

    if (previousMax === undefined) {
      delete process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX;
    } else {
      process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX = previousMax;
    }
  });

  it('limits reset-password attempts', async () => {
    const previousMax = process.env.RESET_PASSWORD_RATE_LIMIT_MAX;
    process.env.RESET_PASSWORD_RATE_LIMIT_MAX = '3';

    const { app } = await buildWithEmail();

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/reset-password',
        payload: { token: 'x', password: 'NewPass123!' },
      });
      statuses.push(res.statusCode);
    }

    expect(statuses.slice(0, 3)).toEqual([400, 400, 400]);
    expect(statuses[3]).toBe(429);

    await app.close();

    if (previousMax === undefined) {
      delete process.env.RESET_PASSWORD_RATE_LIMIT_MAX;
    } else {
      process.env.RESET_PASSWORD_RATE_LIMIT_MAX = previousMax;
    }
  });
});
