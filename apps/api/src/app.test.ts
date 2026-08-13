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

describe('OpenAPI / Swagger UI', () => {
  it('serves the OpenAPI document with all endpoint groups', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    const doc = response.json();
    expect(doc.openapi).toMatch(/^3\.0/);
    expect(doc.info.title).toBe('LifeOS API');
    expect(doc.paths['/auth/login']).toBeDefined();
    expect(doc.paths['/habits']).toBeDefined();
    expect(doc.paths['/goals']).toBeDefined();
    expect(doc.paths['/projects']).toBeDefined();
    expect(doc.paths['/daily-logs']).toBeDefined();
    expect(doc.paths['/stats/analytics']).toBeDefined();
    expect(doc.paths['/progression']).toBeDefined();
    expect(doc.components.securitySchemes.cookieAuth).toBeDefined();
  });

  it('serves the Swagger UI at /docs', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });
});
