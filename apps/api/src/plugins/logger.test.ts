import { buildApp } from '../app';
import { cleanupTestUsers, uniqueEmail } from '../../test/helpers';
import { describe, expect, it, vi, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

describe('logger', () => {
  it('never logs the password, even during a register attempt', async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writes.push(String(chunk));
      return true;
    });

    const app = await buildApp({ csrf: false });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: uniqueEmail(), password: 'TopSecret!123' },
    });
    await app.close();
    vi.restoreAllMocks();

    expect([201, 400]).toContain(res.statusCode);
    expect(writes.join('\n')).not.toContain('TopSecret!123');
  });
});
