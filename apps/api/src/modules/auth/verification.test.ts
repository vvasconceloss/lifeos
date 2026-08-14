import { buildApp } from '../../app';
import { cleanupTestUsers, uniqueEmail } from '../../../test/helpers';
import { prisma } from '../../db/client';
import { hashToken } from '../../lib/tokens';
import { requireVerified } from '../../plugins/auth';
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

/** Requests a verification email and returns the plaintext token from the send. */
async function requestVerification(
  app: Awaited<ReturnType<typeof buildApp>>,
  sends: ReturnType<typeof makeEmailService>['sends'],
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/resend-verification',
    payload: { email },
  });
  expect(res.statusCode).toBe(200);
  const verificationSend = sends.filter((s) => s.template === 'verify-email').at(-1)!;
  return decodeURIComponent(String(verificationSend.data.verificationUrl).split('token=')[1]!);
}

describe('email verification on registration', () => {
  it('creates an unverified user without sending any email or creating a token', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();

    const res = await register(app, email);

    expect(res.statusCode).toBe(201);
    expect(res.json().user.emailVerified).toBe(false);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();

    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: user!.id },
    });
    expect(tokens).toHaveLength(0);
    expect(sends).toHaveLength(0);

    await app.close();
  });
});

describe('POST /v1/auth/verify-email', () => {
  it('verifies a valid token exactly once', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestVerification(app, sends, email);

    const user = await prisma.user.findUnique({ where: { email } });

    const first = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token },
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ emailVerified: true });

    const verified = await prisma.user.findUnique({ where: { email } });
    expect(verified!.emailVerified).toBe(true);

    // Token is single-use — no rows remain.
    const remaining = await prisma.emailVerificationToken.findMany({
      where: { userId: user!.id },
    });
    expect(remaining).toHaveLength(0);

    await app.close();
  });

  it('rejects a reused token after verification', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestVerification(app, sends, email);

    await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token },
    });

    expect(second.statusCode).toBe(400);
    expect(second.json().error.code).toBe('INVALID_VERIFICATION_TOKEN');

    await app.close();
  });

  it('rejects an invalid or nonexistent token', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token: 'not-a-real-token' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_VERIFICATION_TOKEN');

    await app.close();
  });

  it('rejects an expired token', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestVerification(app, sends, email);

    const user = await prisma.user.findUnique({ where: { email } });

    // Force the token into the past.
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VERIFICATION_EXPIRED');

    // The expired token is removed.
    const remaining = await prisma.emailVerificationToken.findMany({
      where: { userId: user!.id },
    });
    expect(remaining).toHaveLength(0);

    await app.close();
  });

  it('is idempotent for an already-verified email', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);
    const token = await requestVerification(app, sends, email);

    const user = await prisma.user.findUnique({ where: { email } });

    await prisma.user.update({ where: { id: user!.id }, data: { emailVerified: true } });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ emailVerified: true });

    await app.close();
  });
});

describe('POST /v1/auth/resend-verification', () => {
  it('sends a verification email only after a resend request', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();

    // Register sends nothing.
    await register(app, email);
    expect(sends).toHaveLength(0);

    // The user requests the email through resend-verification.
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/resend-verification',
      payload: { email },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('a new verification email has been sent');

    expect(sends).toHaveLength(1);
    expect(sends[0]!.to).toBe(email);
    expect(sends[0]!.template).toBe('verify-email');
    expect(String(sends[0]!.data.verificationUrl)).toContain('/verify-email?token=');

    // Exactly one token exists and stores only the hash.
    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: user!.id },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    await app.close();
  });

  it('sends the plaintext token whose hash matches the stored one', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);

    const token = await requestVerification(app, sends, email);

    const user = await prisma.user.findUnique({ where: { email } });
    const stored = await prisma.emailVerificationToken.findFirst({
      where: { userId: user!.id },
    });
    expect(hashToken(token)).toBe(stored!.tokenHash);

    await app.close();
  });

  it('embeds an optional redirect path in the verification link', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/resend-verification',
      payload: { email, redirect: '/settings/habits' },
    });

    expect(res.statusCode).toBe(200);
    expect(String(sends[0]!.data.verificationUrl)).toContain('/verify-email?token=');
    expect(String(sends[0]!.data.verificationUrl)).toContain('&redirect=%2Fsettings%2Fhabits');

    await app.close();
  });

  it('rejects a non-internal redirect path', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/resend-verification',
      payload: { email, redirect: 'https://evil.example.com' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('requesting a resend invalidates the previous token', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);

    const oldToken = await requestVerification(app, sends, email);

    // Second request → new token, previous one deleted.
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/resend-verification',
      payload: { email },
    });
    expect(res.statusCode).toBe(200);

    // The old token no longer works.
    const oldRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token: oldToken },
    });
    expect(oldRes.statusCode).toBe(400);

    // Only one token remains (the newest one), and it still works.
    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: user!.id },
    });
    expect(tokens).toHaveLength(1);

    const newToken = decodeURIComponent(
      String(sends[sends.length - 1]!.data.verificationUrl).split('token=')[1]!,
    );
    const ok = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token: newToken },
    });
    expect(ok.statusCode).toBe(200);

    await app.close();
  });

  it('always returns the generic message even for an unregistered email (anti-enumeration)', async () => {
    const { app, sends } = await buildWithEmail();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/resend-verification',
      payload: { email: uniqueEmail() },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('a new verification email has been sent');
    expect(sends).toHaveLength(0);

    await app.close();
  });

  it('does not resend for an already-verified account but returns the same message', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    await register(app, email);

    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.user.update({ where: { id: user!.id }, data: { emailVerified: true } });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/resend-verification',
      payload: { email },
    });

    expect(res.statusCode).toBe(200);
    expect(sends).toHaveLength(0);

    await app.close();
  });

  it('returns 429 after exceeding the resend rate limit', async () => {
    const previousMax = process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX;
    process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX = '3';

    const { app } = await buildWithEmail();

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/resend-verification',
        payload: { email: uniqueEmail() },
      });
      statuses.push(res.statusCode);
    }

    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses[3]).toBe(429);

    await app.close();

    if (previousMax === undefined) {
      delete process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX;
    } else {
      process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX = previousMax;
    }
  });
});

describe('requireVerified guard', () => {
  it('blocks unverified users from sensitive account actions', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();

    // Register the guarded route before any request is injected (Fastify locks
    // the routing table once listening starts).
    app.get('/v1/_guard-test', { preHandler: requireVerified }, async () => ({ ok: true }));

    const res = await register(app, email);
    const cookie = res.cookies.find((c) => c.name === 'token')!;
    const user = await prisma.user.findUnique({ where: { email } });

    const guarded = await app.inject({
      method: 'GET',
      url: '/v1/_guard-test',
      headers: { cookie: `token=${cookie.value}` },
    });
    expect(guarded.statusCode).toBe(403);
    expect(guarded.json().error.code).toBe('EMAIL_NOT_VERIFIED');

    await prisma.user.update({ where: { id: user!.id }, data: { emailVerified: true } });
    const allowed = await app.inject({
      method: 'GET',
      url: '/v1/_guard-test',
      headers: { cookie: `token=${cookie.value}` },
    });
    expect(allowed.statusCode).toBe(200);

    await app.close();
  });

  it('blocks goals/stats for unverified users but keeps pillars and habits open', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();

    const res = await register(app, email);
    const cookie = `token=${res.cookies.find((c) => c.name === 'token')!.value}`;

    // Pillars + habits stay available without verification.
    const pillars = await app.inject({ method: 'GET', url: '/v1/pillars', headers: { cookie } });
    const habits = await app.inject({ method: 'GET', url: '/v1/habits', headers: { cookie } });
    expect(pillars.statusCode).toBe(200);
    expect(habits.statusCode).toBe(200);

    // Goals + stats are gated until the email is verified.
    const goals = await app.inject({ method: 'GET', url: '/v1/goals', headers: { cookie } });
    const stats = await app.inject({
      method: 'GET',
      url: '/v1/stats/overview',
      headers: { cookie },
    });
    expect(goals.statusCode).toBe(403);
    expect(goals.json().error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(stats.statusCode).toBe(403);

    await app.close();
  });
});
