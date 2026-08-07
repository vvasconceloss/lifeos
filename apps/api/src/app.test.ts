import { buildApp } from './app';
import { describe, expect, it } from 'vitest';

describe('GET /v1/health', () => {
  it('returns the API health status', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
    });
  });
});

describe('GET /v1/health/ready', () => {
  it('reports the database is reachable', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/health/ready',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      db: 'ok',
    });
  });

  it('returns an x-request-id header for correlation', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    await app.close();

    expect(response.headers['x-request-id']).toBeDefined();
  });
});
