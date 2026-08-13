import { buildApp } from './app';
import { prisma } from './db/client';
import { cleanupTestUsers, registerAndGetCookie, uniqueEmail } from '../test/helpers';
import { afterAll, describe, expect, it, vi } from 'vitest';

afterAll(cleanupTestUsers);

describe('Infrastructure failure scenarios', () => {
  it('returns a 503 when the database is unavailable', async () => {
    const app = await buildApp({ csrf: false });
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));

    const res = await app.inject({ method: 'GET', url: '/v1/health/ready' });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'unavailable', db: 'error' });

    await app.close();
  });

  it('rejects a malformed JSON body with 400', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const res = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie, 'content-type': 'application/json' },
      payload: '{not-valid-json',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeDefined();

    await app.close();
  });

  it('rejects an invalid JWT with 401 UNAUTHORIZED', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/pillars',
      headers: { cookie: 'token=not-a-valid-jwt' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });

    await app.close();
  });

  it('rejects a missing cookie with 401 UNAUTHORIZED', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({ method: 'GET', url: '/v1/pillars' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });

    await app.close();
  });

  it('rejects a duplicate email with 409 EMAIL_ALREADY_EXISTS', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email already in use' },
    });

    await app.close();
  });
});
