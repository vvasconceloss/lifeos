import { buildApp } from '../../app';
import { prisma } from '../../db/client';
import { describe, expect, it, afterAll } from 'vitest';

const createdEmails: string[] = [];

function uniqueEmail(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  const email = `test-${suffix}@lifeos.com`;
  createdEmails.push(email);
  return email;
}

afterAll(async () => {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: createdEmails } },
    });
  }
});

describe('POST /v1/auth/register', () => {
  it('registers a user successfully', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
    });

    expect(response.statusCode).toBe(200);

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
    expect(response.json()).toMatchObject({
      user: { email },
    });

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
