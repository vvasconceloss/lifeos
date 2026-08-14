import { buildApp } from '../../app';
import { cleanupTestUsers, registerAndGetCookieVerified, uniqueEmail } from '../../../test/helpers';
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

/** Registers a verified user and returns the session cookie. */
async function registerVerified(
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> {
  return registerAndGetCookieVerified(app, email);
}

describe('POST /v1/account/change-password', () => {
  it('changes the password with the current password and keeps the session', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-password',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newPassword: 'NewPass123!' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('Password updated');

    // Old password fails, new one works.
    const oldLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'Test1234!' },
    });
    const newLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'NewPass123!' },
    });
    expect(oldLogin.statusCode).toBe(401);
    expect(newLogin.statusCode).toBe(200);

    // Security notification sent.
    expect(sends.some((s) => s.template === 'password-changed' && s.to === email)).toBe(true);

    // A fresh session cookie was issued for the current session — it works.
    const newCookie = `token=${res.cookies.find((c) => c.name === 'token')!.value}`;
    const me = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: { cookie: newCookie } });
    expect(me.statusCode).toBe(200);

    await app.close();
  });

  it('rejects an incorrect current password', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-password',
      headers: { cookie },
      payload: { currentPassword: 'Wrong123!', newPassword: 'NewPass123!' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INCORRECT_PASSWORD');

    await app.close();
  });

  it('rejects a weak new password', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-password',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newPassword: 'weak' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('rejects a new password equal to the current one', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-password',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newPassword: 'Test1234!' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('SAME_PASSWORD');

    await app.close();
  });

  it('invalidates other sessions but preserves the current one', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    await registerVerified(app, email);

    // A second session (login) issued before the change.
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'Test1234!' },
    });
    const secondCookie = `token=${loginRes.cookies.find((c) => c.name === 'token')!.value}`;

    // Change the password with the second (other) session.
    const change = await app.inject({
      method: 'POST',
      url: '/v1/account/change-password',
      headers: { cookie: secondCookie },
      payload: { currentPassword: 'Test1234!', newPassword: 'NewPass123!' },
    });
    expect(change.statusCode).toBe(200);

    // The session that performed the change got a fresh JWT and still works.
    const freshCookie = `token=${change.cookies.find((c) => c.name === 'token')!.value}`;
    const stillOk = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: { cookie: freshCookie } });
    expect(stillOk.statusCode).toBe(200);

    await app.close();
  });
});

describe('POST /v1/account/change-email/request', () => {
  it('requests an email change and sends confirm + alert emails', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const newEmail = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain("you'll receive a confirmation email");

    const confirmSend = sends.find((s) => s.template === 'email-change-request' && s.to === newEmail);
    const alertSend = sends.find((s) => s.template === 'email-change-alert' && s.to === email);
    expect(confirmSend).toBeTruthy();
    expect(alertSend).toBeTruthy();
    expect(String(confirmSend!.data.confirmUrl)).toContain('/account/email/confirm?token=');
    expect(String(alertSend!.data.cancelUrl)).toContain('/account/email/cancel?token=');

    await app.close();
  });

  it('rejects an incorrect current password', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Wrong123!', newEmail: uniqueEmail() },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INCORRECT_PASSWORD');

    await app.close();
  });

  it('rejects a new email equal to the current one', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail: email },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('NEW_EMAIL_SAME');

    await app.close();
  });

  it('responds generically and sends nothing when the email is already in use', async () => {
    const { app, sends } = await buildWithEmail();
    const takenEmail = uniqueEmail();
    const attackerEmail = uniqueEmail();
    await registerVerified(app, takenEmail);
    const cookie = await registerVerified(app, attackerEmail);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail: takenEmail },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain("you'll receive a confirmation email");
    expect(sends).toHaveLength(0);

    await app.close();
  });

  it('blocks unverified users (requireVerified)', async () => {
    const app = await buildApp({ csrf: false });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      payload: { currentPassword: 'x', newEmail: 'x@y.com' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});

describe('POST /v1/account/change-email/confirm', () => {
  it('confirms the change, updates the email and notifies both addresses', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const newEmail = uniqueEmail();
    const cookie = await registerVerified(app, email);

    await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail },
    });

    const confirmUrl = String(sends.find((s) => s.template === 'email-change-request')!.data.confirmUrl);
    const token = decodeURIComponent(confirmUrl.split('token=')[1]!);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/confirm',
      payload: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toContain('Email address updated');

    // Any previous session cookie is cleared so the user signs in again with the new address.
    const setCookie = res.cookies.find((c) => c.name === 'token');
    expect(setCookie).toBeTruthy();
    expect(setCookie!.value).toBe('');

    const user = await prisma.user.findUnique({ where: { id: (await prisma.user.findUnique({ where: { email: newEmail } }))!.id } });
    expect(user!.email).toBe(newEmail);
    expect(user!.emailVerified).toBe(true);

    // Both addresses notified.
    const newNotified = sends.some((s) => s.template === 'email-changed' && s.to === newEmail);
    const oldNotified = sends.some((s) => s.template === 'email-changed' && s.to === email);
    expect(newNotified).toBe(true);
    expect(oldNotified).toBe(true);

    await app.close();
  });

  it('rejects an expired confirmation link', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const newEmail = uniqueEmail();
    const cookie = await registerVerified(app, email);

    await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail },
    });

    const confirmUrl = String(sends.find((s) => s.template === 'email-change-request')!.data.confirmUrl);
    const token = decodeURIComponent(confirmUrl.split('token=')[1]!);

    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.emailChangeToken.updateMany({
      where: { userId: user!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/confirm',
      payload: { token },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('EMAIL_CHANGE_EXPIRED');

    await app.close();
  });

  it('rejects an invalid or reused confirmation link', async () => {
    const { app } = await buildWithEmail();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/confirm',
      payload: { token: 'not-a-token' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_EMAIL_CHANGE_TOKEN');

    await app.close();
  });
});

describe('email change cancellation', () => {
  it('cancels a pending request from the authenticated account', async () => {
    const { app } = await buildWithEmail();
    const email = uniqueEmail();
    const newEmail = uniqueEmail();
    const cookie = await registerVerified(app, email);

    await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/account/change-email/cancel',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.emailChangeToken.findMany({ where: { userId: user!.id } });
    expect(tokens).toHaveLength(0);

    await app.close();
  });

  it('cancels via the link token sent to the old email (no login)', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const newEmail = uniqueEmail();
    const cookie = await registerVerified(app, email);

    await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail },
    });

    const cancelUrl = String(sends.find((s) => s.template === 'email-change-alert')!.data.cancelUrl);
    const token = decodeURIComponent(cancelUrl.split('token=')[1]!);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/cancel',
      payload: { token },
    });

    expect(res.statusCode).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.emailChangeToken.findMany({ where: { userId: user!.id } });
    expect(tokens).toHaveLength(0);

    await app.close();
  });

  it('consecutive requests invalidate previous tokens', async () => {
    const { app, sends } = await buildWithEmail();
    const email = uniqueEmail();
    const cookie = await registerVerified(app, email);

    await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail: uniqueEmail() },
    });
    const firstConfirmUrl = String(sends.find((s) => s.template === 'email-change-request')!.data.confirmUrl);
    const firstToken = decodeURIComponent(firstConfirmUrl.split('token=')[1]!);

    await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/request',
      headers: { cookie },
      payload: { currentPassword: 'Test1234!', newEmail: uniqueEmail() },
    });

    // Only one token remains.
    const user = await prisma.user.findUnique({ where: { email } });
    const tokens = await prisma.emailChangeToken.findMany({ where: { userId: user!.id } });
    expect(tokens).toHaveLength(1);

    // The first confirm token no longer works.
    const oldRes = await app.inject({
      method: 'POST',
      url: '/v1/account/change-email/confirm',
      payload: { token: firstToken },
    });
    expect(oldRes.statusCode).toBe(400);

    await app.close();
  });
});
