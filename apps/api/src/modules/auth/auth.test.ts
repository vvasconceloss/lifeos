import { buildApp } from '../../app';
import { cleanupTestUsers, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';
import { PASSWORD_ERRORS } from '@lifeos/shared';

afterAll(cleanupTestUsers);

describe('POST /v1/auth/register', () => {
  it('registers a user successfully', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();
    expect(body.user).toMatchObject({ email, name: null });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.token).toBeTruthy();
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'token' }),
      ]),
    );

    await app.close();
  });

  it('rejects a duplicate email', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { message: 'Email already in use' } });

    await app.close();
  });

  it('rejects a short password', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: uniqueEmail(), password: '123' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.message).toBe('Validation failed');
    expect(body.error.details).toBeDefined();

    await app.close();
  });

  it.each<[string, string]>([
    ['12345678', PASSWORD_ERRORS.LOWERCASE],
    ['abcdefgh', PASSWORD_ERRORS.UPPERCASE],
    ['Abcdefgh', PASSWORD_ERRORS.NUMBER],
    ['Abcdef12', PASSWORD_ERRORS.SPECIAL],
  ])('rejects a password violating a policy rule: %s', async (password, message) => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: uniqueEmail(), password },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.details[0].message).toBe(message);

    await app.close();
  });

  it('rejects a common password', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: uniqueEmail(), password: 'password1' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.details.map((i: { message: string }) => i.message)).toContain(
      PASSWORD_ERRORS.COMMON,
    );

    await app.close();
  });

  it('rejects a password equal to the email', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'T3st@lifeos.com', password: 'T3st@lifeos.com' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.details[0].message).toBe(PASSWORD_ERRORS.EMAIL_EQUAL);

    await app.close();
  });

  it('rejects a password exceeding the 72-byte bcrypt limit', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: uniqueEmail(), password: `A1!${'a'.repeat(72)}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.details[0].message).toBe(PASSWORD_ERRORS.MAX_BYTES);

    await app.close();
  });

  it('returns 429 after exceeding the register rate limit', async () => {
    const previousMax = process.env.REGISTER_RATE_LIMIT_MAX;
    process.env.REGISTER_RATE_LIMIT_MAX = '3';

    const app = await buildApp({ csrf: false });

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: uniqueEmail(), password: 'Test1234!' },
      });
      statuses.push(res.statusCode);
    }

    expect(statuses.slice(0, 3)).toEqual([201, 201, 201]);
    expect(statuses[3]).toBe(429);

    await app.close();

    if (previousMax === undefined) {
      delete process.env.REGISTER_RATE_LIMIT_MAX;
    } else {
      process.env.REGISTER_RATE_LIMIT_MAX = previousMax;
    }
  });
});

describe('POST /v1/auth/login', () => {
  it('logs in successfully', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'Test1234!' },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.user).toMatchObject({ email });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.token).toBeTruthy();
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'token' }),
      ]),
    );

    await app.close();
  });

  it('rejects incorrect credentials', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: uniqueEmail(), password: 'wrongpassword' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { message: 'Invalid email or password' },
    });

    await app.close();
  });

  it('returns 429 after exceeding the login rate limit', async () => {
    const previousMax = process.env.LOGIN_RATE_LIMIT_MAX;
    process.env.LOGIN_RATE_LIMIT_MAX = '3';

    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });

    const statuses: number[] = [];
    let limitedResponse: Awaited<ReturnType<typeof app.inject>> | null = null;
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email, password: 'wrongpassword' },
      });
      statuses.push(res.statusCode);
      if (res.statusCode === 429) limitedResponse = res;
    }

    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
    expect(limitedResponse!.json()).toMatchObject({
      error: { message: expect.stringContaining('Rate limit exceeded') },
    });

    await app.close();

    if (previousMax === undefined) {
      delete process.env.LOGIN_RATE_LIMIT_MAX;
    } else {
      process.env.LOGIN_RATE_LIMIT_MAX = previousMax;
    }
  });
});

describe('PATCH /v1/auth/me', () => {
  it('updates profile and preferences', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();
    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });
    const tokenCookie = registerRes.cookies.find((c) => c.name === 'token');
    const cookie = `token=${tokenCookie!.value}`;

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      headers: { cookie },
      payload: { name: 'Victor', timezone: 'Europe/Lisbon', weekStart: 0, theme: 'dark' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({
      name: 'Victor',
      timezone: 'Europe/Lisbon',
      weekStart: 0,
      theme: 'dark',
    });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      payload: { name: 'Victor' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /v1/auth/onboarding', () => {
  function cookieFrom(res: { cookies: Array<{ name: string; value: string }> }): string {
    const tokenCookie = res.cookies.find((c) => c.name === 'token');
    return `token=${tokenCookie!.value}`;
  }

  it('creates pillars and habits and marks the user as onboarded', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });
    const cookie = cookieFrom(registerRes);

    expect(registerRes.json().user.onboarded).toBe(false);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/onboarding',
      headers: { cookie },
      payload: {
        pillars: [
          { name: 'Health', color: '#ef4444', icon: '❤️' },
          { name: 'Engineering', color: '#3b82f6', icon: '💻' },
        ],
        habits: [
          { name: 'Drink water', pillarIndex: 0, icon: '💧' },
          { name: 'Program', pillarIndex: 1, icon: '⌨️' },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      user: { email, onboarded: true },
      pillarsCreated: 2,
      habitsCreated: 2,
    });

    const meRes = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { cookie },
    });
    expect(meRes.json().user.onboarded).toBe(true);

    const pillarsRes = await app.inject({
      method: 'GET',
      url: '/v1/pillars',
      headers: { cookie },
    });
    expect(pillarsRes.json().pillars).toHaveLength(2);
    expect(pillarsRes.json().pillars.map((p: { name: string }) => p.name)).toEqual([
      'Health',
      'Engineering',
    ]);

    const habitsRes = await app.inject({
      method: 'GET',
      url: '/v1/habits?includeArchived=true',
      headers: { cookie },
    });
    expect(habitsRes.json().habits).toHaveLength(2);
    expect(habitsRes.json().habits.map((h: { name: string }) => h.name)).toEqual([
      'Drink water',
      'Program',
    ]);

    await app.close();
  });

  it('marks the user as onboarded when no pillars are selected (skip)', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });
    const cookie = cookieFrom(registerRes);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/onboarding',
      headers: { cookie },
      payload: { pillars: [], habits: [] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      user: { email, onboarded: true },
      pillarsCreated: 0,
      habitsCreated: 0,
    });

    await app.close();
  });

  it('rejects a habit referencing a non-selected pillar', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });
    const cookie = cookieFrom(registerRes);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/onboarding',
      headers: { cookie },
      payload: {
        pillars: [{ name: 'Health' }],
        habits: [{ name: 'Program', pillarIndex: 1 }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { message: 'A habit references a pillar that was not selected' },
    });

    await app.close();
  });

  it('rejects calling onboarding twice', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });
    const cookie = cookieFrom(registerRes);

    await app.inject({
      method: 'POST',
      url: '/v1/auth/onboarding',
      headers: { cookie },
      payload: { pillars: [], habits: [] },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/onboarding',
      headers: { cookie },
      payload: { pillars: [], habits: [] },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: { message: 'User already completed onboarding' },
    });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/onboarding',
      payload: { pillars: [], habits: [] },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /v1/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });

    const tokenCookie = registerRes.cookies.find(
      (c) => c.name === 'token',
    );
    expect(tokenCookie).toBeDefined();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        cookie: `token=${tokenCookie!.value}`,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.user).toMatchObject({ email });
    expect(body.user).not.toHaveProperty('passwordHash');

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { message: 'Unauthorized' } });

    await app.close();
  });

  it('rejects an expired token', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'Test1234!' },
    });

    const expired = app.jwt.sign({
      sub: 'user-1',
      email,
      exp: Math.floor(Date.now() / 1000) - 60,
    } as { sub: string; email: string; exp: number });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { cookie: `token=${expired}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { message: 'Unauthorized' } });

    await app.close();
  });

  it('sets a session cookie and token that expire in 30 days', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: uniqueEmail(), password: 'Test1234!' },
    });

    const tokenCookie = response.cookies.find((c) => c.name === 'token');
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie!.maxAge).toBe(30 * 24 * 60 * 60);

    const exp = JSON.parse(
      Buffer.from(tokenCookie!.value.split('.')[1]!, 'base64url').toString('utf8'),
    ).exp as number;
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000) + 29 * 24 * 60 * 60);
    expect(exp).toBeLessThan(Math.floor(Date.now() / 1000) + 31 * 24 * 60 * 60);

    await app.close();
  });
});
