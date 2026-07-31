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

async function registerAndGetCookie(
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password: 'test1234' },
  });
  const tokenCookie = res.cookies.find((c) => c.name === 'token');
  return `token=${tokenCookie!.value}`;
}

async function createPillar(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
  name: string,
) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/pillars',
    headers: { cookie },
    payload: { name },
  });
  return res.json().pillar.id;
}

async function createHabit(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
  name: string,
  pillarId: string,
) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/habits',
    headers: { cookie },
    payload: { name, pillarId },
  });
  return res.json().habit.id;
}

const TODAY = '2026-06-15';

describe('PUT /v1/habits/:id/completions/:date', () => {
  it('marks a habit as completed', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.completion).toMatchObject({
      habitId,
      date: `${TODAY}T00:00:00.000Z`,
    });

    await app.close();
  });

  it('does not duplicate on second mark', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const first = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/${TODAY}`,
      headers: { cookie },
    });

    const second = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/${TODAY}`,
      headers: { cookie },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());

    await app.close();
  });

  it('rejects a future date', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/2099-12-31`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: 'Cannot mark future dates',
    });

    await app.close();
  });

  it('returns 404 for a non-existent habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/habits/00000000-0000-0000-0000-000000000000/completions/${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/habits/00000000-0000-0000-0000-000000000000/completions/${TODAY}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('rejects marking another user\'s habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());

    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Run', pillarA);

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitA}/completions/${TODAY}`,
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});

describe('DELETE /v1/habits/:id/completions/:date', () => {
  it('unmarks a completed habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/${TODAY}`,
      headers: { cookie },
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/habits/${habitId}/completions/${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when no completion exists', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/habits/${habitId}/completions/${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: 'Completion not found',
    });

    await app.close();
  });

  it('returns 404 for a non-existent habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/habits/00000000-0000-0000-0000-000000000000/completions/${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/habits/00000000-0000-0000-0000-000000000000/completions/${TODAY}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('rejects unmarking another user\'s habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());

    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Run', pillarA);

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/habits/${habitA}/completions/${TODAY}`,
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});

describe('GET /v1/completions', () => {
  it('lists completions within a date range', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/${TODAY}`,
      headers: { cookie },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/completions?from=${TODAY}&to=${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().completions).toHaveLength(1);
    expect(response.json().completions[0]).toMatchObject({
      habitId,
      date: `${TODAY}T00:00:00.000Z`,
    });

    await app.close();
  });

  it('returns an empty list when no completions match', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: `/v1/completions?from=${TODAY}&to=${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ completions: [] });

    await app.close();
  });

  it('respects user isolation', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());

    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Run', pillarA);

    await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitA}/completions/${TODAY}`,
      headers: { cookie: cookieA },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/completions?from=${TODAY}&to=${TODAY}`,
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ completions: [] });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/completions',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('input validation', () => {
  it('rejects an invalid completion date', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/2026-06-99`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Validation failed' });

    await app.close();
  });

  it('rejects an impossible calendar date', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/2026-02-30`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects a non-uuid habit id on mark', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'PUT',
      url: '/v1/habits/not-a-uuid/completions/2026-06-15',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Validation failed' });

    await app.close();
  });

  it('rejects an invalid from query', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/completions?from=2026-06-32',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
