import { buildApp } from '../app';
import { describe, expect, it } from 'vitest';

describe('security headers', () => {
  it('sets core security headers on responses', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');

    await app.close();
  });

  it('does not send a content security policy for the JSON API', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    expect(res.headers['content-security-policy']).toBeUndefined();

    await app.close();
  });
});
