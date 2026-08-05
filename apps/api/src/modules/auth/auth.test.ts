import { buildApp } from '../../app';
import { cleanupTestUsers, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

describe('POST /v1/auth/register', () => {
  it('registers a user successfully', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
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
      payload: { email, password: 'test1234' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: 'Email already in use' });

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
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();

    await app.close();
  });
});

describe('POST /v1/auth/login', () => {
  it('logs in successfully', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'test1234' },
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
      error: 'Invalid email or password',
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
      payload: { email, password: 'test1234' },
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
      error: expect.stringContaining('Rate limit exceeded'),
    });

    await app.close();

    if (previousMax === undefined) {
      delete process.env.LOGIN_RATE_LIMIT_MAX;
    } else {
      process.env.LOGIN_RATE_LIMIT_MAX = previousMax;
    }
  });
});

describe('GET /v1/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
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
    expect(response.json()).toMatchObject({ error: 'Unauthorized' });

    await app.close();
  });
});
