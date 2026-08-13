import { buildApp } from '../app';
import { describe, expect, it } from 'vitest';

describe('error response format', () => {
  it('returns a consistent 404 for unknown routes', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/nonexistent',
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Not Found' } });

    await app.close();
  });

  it('returns a generic 500 without leaking internal details', async () => {
    const app = await buildApp({ csrf: false });

    app.get('/v1/boom', async () => {
      throw new Error('secret internal detail');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/boom',
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } });
    expect(JSON.stringify(res.json())).not.toContain('secret');

    await app.close();
  });

  it('preserves status and message for client errors', async () => {
    const app = await buildApp({ csrf: false });

    app.get('/v1/bad', async () => {
      const error = new Error('Bad request thing') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/bad',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: 'APP_ERROR', message: 'Bad request thing' } });

    await app.close();
  });
});
