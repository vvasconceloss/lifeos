import { buildApp } from '../app';
import { cleanupTestUsers, uniqueEmail } from '../../test/helpers';
import { describe, expect, it, vi, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

async function captureWrites() {
  const writes: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    writes.push(String(chunk));
    return true;
  });
  return writes;
}

describe('logger', () => {
  it('never logs the password, even during a register attempt', async () => {
    const writes = await captureWrites();

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

  it('never logs plaintext tokens, even on an invalid recovery attempt', async () => {
    const writes = await captureWrites();

    const app = await buildApp({ csrf: false });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/recover',
      payload: { token: 'super-secret-plaintext-token-123456' },
    });
    await app.close();
    vi.restoreAllMocks();

    expect([400, 429]).toContain(res.statusCode);
    expect(writes.join('\n')).not.toContain('super-secret-plaintext-token-123456');
  });

  it('never logs the new password on a change-password attempt', async () => {
    const writes = await captureWrites();

    const app = await buildApp({ csrf: false });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/account/change-password',
      payload: {
        currentPassword: 'OldPass!123',
        newPassword: 'BrandNew!Secret456',
      },
    });
    await app.close();
    vi.restoreAllMocks();

    expect([200, 400, 401, 429]).toContain(res.statusCode);
    const logs = writes.join('\n');
    expect(logs).not.toContain('BrandNew!Secret456');
    expect(logs).not.toContain('OldPass!123');
  });
});
