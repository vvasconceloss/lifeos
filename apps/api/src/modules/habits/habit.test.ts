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

describe('POST /v1/habits', () => {
  it('creates a habit successfully', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Morning run', pillarId },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      habit: {
        name: 'Morning run',
        pillarId,
        pillarName: 'Health',
        isActive: true,
      },
    });

    await app.close();
  });

  it('rejects a non-existent pillar', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: {
        name: 'Test',
        pillarId: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'Pillar not found' });

    await app.close();
  });

  it('rejects another user\'s pillar', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookieA, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie: cookieB },
      payload: { name: 'Test', pillarId },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects an empty name', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: '', pillarId },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Validation failed' });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      payload: { name: 'Test', pillarId: 'x' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /v1/habits', () => {
  it('lists active habits', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });

    await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Read', pillarId },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().habits).toHaveLength(2);
    expect(response.json()).toMatchObject({
      habits: [{ name: 'Run' }, { name: 'Read' }],
    });

    await app.close();
  });

  it('excludes archived habits by default', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });
    const habitId = createRes.json().habit.id;

    await app.inject({
      method: 'POST',
      url: `/v1/habits/${habitId}/archive`,
      headers: { cookie },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ habits: [] });

    await app.close();
  });

  it('includes archived habits when asked', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });
    const habitId = createRes.json().habit.id;

    await app.inject({
      method: 'POST',
      url: `/v1/habits/${habitId}/archive`,
      headers: { cookie },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits?includeArchived=true',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().habits).toHaveLength(1);
    expect(response.json().habits[0].isActive).toBe(false);

    await app.close();
  });

  it('returns an empty list when user has no habits', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ habits: [] });

    await app.close();
  });

  it('does not leak other users\' habits', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookieA, 'Health');

    await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie: cookieA },
      payload: { name: 'Secret', pillarId },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits',
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ habits: [] });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /v1/habits/:id', () => {
  it('returns a habit by id', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });
    const habitId = createRes.json().habit.id;

    const response = await app.inject({
      method: 'GET',
      url: `/v1/habits/${habitId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      habit: { name: 'Run', pillarName: 'Health' },
    });

    await app.close();
  });

  it('returns 404 for a non-existent habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('PATCH /v1/habits/:id', () => {
  it('updates a habit name', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });
    const habitId = createRes.json().habit.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/habits/${habitId}`,
      headers: { cookie },
      payload: { name: 'Evening run' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      habit: { name: 'Evening run' },
    });

    await app.close();
  });

  it('returns 404 for a non-existent habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000',
      headers: { cookie },
      payload: { name: 'Test' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects a pillar belonging to another user', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Health');
    const pillarB = await createPillar(app, cookieB, 'Engineering');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie: cookieA },
      payload: { name: 'Run', pillarId: pillarA },
    });
    const habitId = createRes.json().habit.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/habits/${habitId}`,
      headers: { cookie: cookieA },
      payload: { pillarId: pillarB },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000',
      payload: { name: 'Test' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('DELETE /v1/habits/:id', () => {
  it('deletes a habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });
    const habitId = createRes.json().habit.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/habits/${habitId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 for a non-existent habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('POST /v1/habits/:id/archive', () => {
  it('archives a habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });
    const habitId = createRes.json().habit.id;

    const response = await app.inject({
      method: 'POST',
      url: `/v1/habits/${habitId}/archive`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      habit: { isActive: false },
    });
    expect(response.json().habit.archivedAt).toBeTruthy();

    await app.close();
  });

  it('returns 404 for a non-existent habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000/archive',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000/archive',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('input validation', () => {
  it('rejects a non-uuid habit id', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits/not-a-uuid',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Validation failed' });

    await app.close();
  });

  it('rejects an invalid includeArchived query', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits?includeArchived=maybe',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Validation failed' });

    await app.close();
  });
});

describe('user isolation', () => {
  it('prevents another user from reading or mutating a habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Health');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie: cookieA },
      payload: { name: 'Secret', pillarId: pillarA },
    });
    const habitId = createRes.json().habit.id;

    const get = await app.inject({
      method: 'GET',
      url: `/v1/habits/${habitId}`,
      headers: { cookie: cookieB },
    });
    expect(get.statusCode).toBe(404);

    const patch = await app.inject({
      method: 'PATCH',
      url: `/v1/habits/${habitId}`,
      headers: { cookie: cookieB },
      payload: { name: 'Hacked' },
    });
    expect(patch.statusCode).toBe(404);

    const archive = await app.inject({
      method: 'POST',
      url: `/v1/habits/${habitId}/archive`,
      headers: { cookie: cookieB },
    });
    expect(archive.statusCode).toBe(404);

    const del = await app.inject({
      method: 'DELETE',
      url: `/v1/habits/${habitId}`,
      headers: { cookie: cookieB },
    });
    expect(del.statusCode).toBe(404);

    const stillThere = await app.inject({
      method: 'GET',
      url: `/v1/habits/${habitId}`,
      headers: { cookie: cookieA },
    });
    expect(stillThere.statusCode).toBe(200);
    expect(stillThere.json().habit.name).toBe('Secret');

    await app.close();
  });
});
