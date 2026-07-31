import { buildApp } from '../app';
import { DEFAULT_ALLOWED_ORIGINS, parseAllowedOrigins } from './cors';
import { describe, expect, it } from 'vitest';

describe('CORS', () => {
  it('reflects an allowed origin', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'http://localhost:5173' },
    });

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');

    await app.close();
  });

  it('does not allow a disallowed origin', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'https://evil.example.com' },
    });

    expect(res.headers['access-control-allow-origin']).toBeUndefined();

    await app.close();
  });

  it('allows requests without an origin', async () => {
    const app = await buildApp({ csrf: false });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();

    await app.close();
  });
});

describe('parseAllowedOrigins', () => {
  it('throws when a wildcard is configured', () => {
    expect(() => parseAllowedOrigins('*')).toThrow();
    expect(() => parseAllowedOrigins('http://localhost:5173,*')).toThrow();
  });

  it('parses and trims a comma separated list', () => {
    expect(parseAllowedOrigins('http://a.com, http://b.com')).toEqual([
      'http://a.com',
      'http://b.com',
    ]);
  });

  it('uses the default local origins when unset', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(DEFAULT_ALLOWED_ORIGINS);
  });
});
