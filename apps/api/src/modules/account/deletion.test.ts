import { buildApp } from '../../app';
import { cleanupTestUsers, registerAndGetCookieVerified, loginAndGetCookie, uniqueEmail } from '../../../test/helpers';
import { prisma } from '../../db/client';
import { hashToken } from '../../lib/tokens';
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

/** Registers a verified user and returns the session cookie. */
async function registerVerified(
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> {
  return registerAndGetCookieVerified(app, email);
}

/** Requests deletion and returns the recovery token from the send. */
async function requestDeletion(
  app: Awaited<ReturnType<typeof buildApp>>,
  sends: ReturnType<typeof makeEmailService>['sends'],
  cookie: string,
): Promise<{ token: string; scheduledDeletionAt: Date }> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/account/delete',
    headers: { cookie },
    payload: { currentPassword: 'Test1234!' },
  });
  expect(res.statusCode).toBe(200);
  const send = sends.find((s) => s.template === 'account-deletion-requested')!;
  const token = decodeURIComponent(String(send.data.recoveryUrl).split('token=')[1]!);
  return { token, scheduledDeletionAt: new Date(send.data.deletionDate as string) };
}

describe('POST /v1/account/delete', () => {
  it('sets PENDING_DELETION, stores a hashed token, schedules +15 days and clears sessions', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/delete',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('recover it within 15 days');

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.status).toBe('PENDING_DELETION');
    expect(user!.deletionRequestedAt).toBeTruthy();
    expect(user!.scheduledDeletionAt).toBeTruthy();

    const graceMs = user!.scheduledDeletionAt!.getTime() - user!.deletionRequestedAt!.getTime();
    expect(graceMs).toBe(15 * 24 * 60 * 60 * 1000);

    // Confirmation email with a recovery link.
    const send = sends.find((s) => s.template === 'account-deletion-requested');
    expect(send).toBeTruthy();
    expect(send!.to).toBe(email);
    expect(String(send!.data.recoveryUrl)).toContain('/account/recover?token=');

    // Token is stored hashed only.
    const token = decodeURIComponent(String(send!.data.recoveryUrl).split('token=')[1]!);
    const stored = await prisma.accountDeletionToken.findFirst({ where: { userId: user!.id } });
    expect(stored!.tokenHash).toBe(hashToken(token));
    expect(stored!.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    // Session is cleared.
    const clearCookie = res.cookies.find((c) => c.name === 'token');
    expect(clearCookie).toBeTruthy();
    expect(clearCookie!.value).toBe('');

    await app.close();
  });

  it('rejects an incorrect current password', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/delete',
      headers: { cookie },
      payload: { currentPassword: 'Wrong123!' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INCORRECT_PASSWORD');

    await app.close();
  });

  it('rejects a duplicate deletion request', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    await requestDeletion(app, sends, cookie);

    // The first delete cleared the session; log in again to attempt a duplicate.
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'Test1234!' },
    });
    const freshCookie = `token=${login.cookies.find((c) => c.name === 'token')!.value}`;

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/delete',
      headers: { cookie: freshCookie },
      payload: { currentPassword: 'Test1234!' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ALREADY_PENDING_DELETION');

    await app.close();
  });
});

describe('recovery', () => {
  it('recovers via the email token (Path A)', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    const { token } = await requestDeletion(app, sends, cookie);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/recover',
      payload: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('Account recovered');

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.status).toBe('ACTIVE');
    expect(user!.deletionRequestedAt).toBeNull();
    expect(user!.scheduledDeletionAt).toBeNull();

    // Token is single-use.
    const tokens = await prisma.accountDeletionToken.findMany({ where: { userId: user!.id } });
    expect(tokens).toHaveLength(0);

    // Security notification is sent after recovery.
    const recovered = sends.find((s) => s.template === 'account-recovered');
    expect(recovered).toBeDefined();
    expect(recovered!.to).toBe(email);

    await app.close();
  });

  it('recovers via authenticated cancellation (Path B)', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    await requestDeletion(app, sends, cookie);

    // The deletion request invalidated all sessions; a real user logs in again.
    const freshCookie = await loginAndGetCookie(app, email);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/cancel-deletion',
      headers: { cookie: freshCookie },
    });

    expect(res.statusCode).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.status).toBe('ACTIVE');

    // Security notification is sent after recovery.
    const recovered = sends.find((s) => s.template === 'account-recovered');
    expect(recovered).toBeDefined();
    expect(recovered!.to).toBe(email);

    await app.close();
  });

  it('recovery idempotency: Path B on an already-active account does not error', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    await requestDeletion(app, sends, cookie);

    // Recover via Path B with a fresh session.
    const freshCookie = await loginAndGetCookie(app, email);
    await app.inject({ method: 'POST', url: '/v1/account/cancel-deletion', headers: { cookie: freshCookie } });

    // Cancelling again is a no-op, no error.
    const again = await app.inject({
      method: 'POST',
      url: '/v1/account/cancel-deletion',
      headers: { cookie: freshCookie },
    });
    expect(again.statusCode).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.status).toBe('ACTIVE');

    await app.close();
  });

  it('rejects an expired recovery token', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    const { token } = await requestDeletion(app, sends, cookie);

    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.accountDeletionToken.updateMany({
      where: { userId: user!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await app.inject({ method: 'POST', url: '/v1/account/recover', payload: { token } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('RECOVERY_EXPIRED');

    await app.close();
  });

  it('rejects an invalid recovery token', async () => {
    const { app } = await buildWithEmail();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/recover',
      payload: { token: 'not-a-token' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_RECOVERY_TOKEN');

    await app.close();
  });
});

describe('access during PENDING_DELETION', () => {
  it('blocks normal protected routes but allows auth/me', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    await requestDeletion(app, sends, cookie);

    // The deletion invalidated the session; log in again to confirm access rules.
    const freshCookie = await loginAndGetCookie(app, email);

    // Pillars (normally open) are now blocked.
    const pillars = await app.inject({ method: 'GET', url: '/v1/pillars', headers: { cookie: freshCookie } });
    expect(pillars.statusCode).toBe(403);
    expect(pillars.json().error.code).toBe('ACCOUNT_PENDING_DELETION');

    // auth/me still works (frontend reads the status to show the recovery screen).
    const me = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: { cookie: freshCookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.status).toBe('PENDING_DELETION');

    await app.close();
  });
});

describe('deletion job', () => {
  it('deletes due accounts, sends the final email and cascades data', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    await requestDeletion(app, sends, cookie);

    // The deletion invalidated the session; a fresh login still hits the
    // PENDING_DELETION block (proves the middleware, not a stale cookie, returns 403).
    const freshCookie = await loginAndGetCookie(app, email);

    // Create some data that must cascade away.
    const pillarRes = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie: freshCookie },
      payload: { name: 'Health' },
    });
    // Pillars are blocked while pending — force the data directly instead.
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.pillar.create({
      data: { name: 'Health', userId: user!.id },
    });
    expect(pillarRes.statusCode).toBe(403); // sanity: app blocked

    // Force the scheduled date into the past.
    await prisma.user.update({
      where: { id: user!.id },
      data: { scheduledDeletionAt: new Date(Date.now() - 1000) },
    });

    const before = await prisma.pillar.findFirst({ where: { userId: user!.id } });
    expect(before).toBeTruthy();

    await app.close();

    // Run the job directly.
    const { processAccountDeletions } = await import('../account/account.service');
    const finalSends: string[] = [];
    const { deleted } = await processAccountDeletions(async (to) => {
      finalSends.push(to);
    });

    expect(finalSends).toContain(email);
    expect(deleted).toHaveLength(1);

    const gone = await prisma.user.findUnique({ where: { email } });
    expect(gone).toBeNull();

    // Cascaded: the pillar is gone too.
    const pillarGone = await prisma.pillar.findFirst({ where: { userId: user!.id } });
    expect(pillarGone).toBeNull();
  });

  it('does not affect accounts still within the grace period', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    await requestDeletion(app, sends, cookie);

    // Not yet due (defaults to +15 days).
    const { processAccountDeletions } = await import('../account/account.service');
    const { deleted } = await processAccountDeletions(async () => {});

    expect(deleted).toHaveLength(0);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.status).toBe('PENDING_DELETION');

    await app.close();
  });

  it('is idempotent (running twice does not error or duplicate)', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    await requestDeletion(app, sends, cookie);

    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.user.update({
      where: { id: user!.id },
      data: { scheduledDeletionAt: new Date(Date.now() - 1000) },
    });

    const { processAccountDeletions } = await import('../account/account.service');
    const first = await processAccountDeletions(async () => {});
    const second = await processAccountDeletions(async () => {});

    expect(first.deleted).toHaveLength(1);
    expect(second.deleted).toHaveLength(0);

    await app.close();
  });
});

describe('account security — rate limiting', () => {
  it('returns 429 after exceeding the change-password rate limit', async () => {
    const previousMax = process.env.CHANGE_PASSWORD_RATE_LIMIT_MAX;
    process.env.CHANGE_PASSWORD_RATE_LIMIT_MAX = '2';

    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const statuses: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/account/change-password',
        headers: { cookie },
        payload: { currentPassword: 'Test1234!', newPassword: 'NewPass123!' },
      });
      statuses.push(res.statusCode);
    }

    expect(statuses[0]).toBe(200);
    expect(statuses[2]).toBe(429);

    await app.close();
    void sends;

    if (previousMax === undefined) {
      delete process.env.CHANGE_PASSWORD_RATE_LIMIT_MAX;
    } else {
      process.env.CHANGE_PASSWORD_RATE_LIMIT_MAX = previousMax;
    }
  });

  it('returns 429 after exceeding the recover rate limit', async () => {
    const previousMax = process.env.RECOVER_ACCOUNT_RATE_LIMIT_MAX;
    process.env.RECOVER_ACCOUNT_RATE_LIMIT_MAX = '2';

    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);
    const { token } = await requestDeletion(app, sends, cookie);

    // First call succeeds and consumes the single-use token.
    const first = await app.inject({
      method: 'POST',
      url: '/v1/account/recover',
      payload: { token },
    });
    expect(first.statusCode).toBe(200);

    // Subsequent attempts (even with a stale token) hit the rate limit.
    const second = await app.inject({
      method: 'POST',
      url: '/v1/account/recover',
      payload: { token: 'stale-token' },
    });
    const third = await app.inject({
      method: 'POST',
      url: '/v1/account/recover',
      payload: { token: 'stale-token' },
    });
    expect(second.statusCode).toBe(400);
    expect(third.statusCode).toBe(429);

    await app.close();

    if (previousMax === undefined) {
      delete process.env.RECOVER_ACCOUNT_RATE_LIMIT_MAX;
    } else {
      process.env.RECOVER_ACCOUNT_RATE_LIMIT_MAX = previousMax;
    }
  });
});
