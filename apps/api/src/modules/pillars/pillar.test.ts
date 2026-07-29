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

async function registerAndGetCookie(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password: 'test1234' },
  });

  const tokenCookie = res.cookies.find((c) => c.name === 'token');
  return `token=${tokenCookie!.value}`;
}

describe('POST /v1/pillars', () => {
  it('creates a pillar successfully', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie },
      payload: { name: 'Health' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      pillar: { name: 'Health' },
    });

    await app.close();
  });

  it('rejects an empty name', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie },
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Validation failed' });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      payload: { name: 'Health' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /v1/pillars', () => {
  it('lists the user\'s pillars', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie },
      payload: { name: 'Health' },
    });

    await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie },
      payload: { name: 'Engineering' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/pillars',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      pillars: [{ name: 'Health' }, { name: 'Engineering' }],
    });

    await app.close();
  });

  it('returns an empty list when user has no pillars', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/pillars',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ pillars: [] });

    await app.close();
  });

  it('does not leak other users\' pillars', async () => {
    const app = await buildApp({ csrf: false });

    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());

    await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie: cookieA },
      payload: { name: 'UserA-Pillar' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/pillars',
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ pillars: [] });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/pillars',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('PATCH /v1/pillars/:id', () => {
  it('updates a pillar name', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie },
      payload: { name: 'Health' },
    });

    const pillarId = createRes.json().pillar.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/pillars/${pillarId}`,
      headers: { cookie },
      payload: { name: 'Engineering' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      pillar: { name: 'Engineering' },
    });

    await app.close();
  });

  it('returns 404 for a non-existent pillar', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/pillars/00000000-0000-0000-0000-000000000000',
      headers: { cookie },
      payload: { name: 'Test' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'Pillar not found' });

    await app.close();
  });

  it('returns 404 for another user\'s pillar', async () => {
    const app = await buildApp({ csrf: false });

    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie: cookieA },
      payload: { name: 'Health' },
    });

    const pillarId = createRes.json().pillar.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/pillars/${pillarId}`,
      headers: { cookie: cookieB },
      payload: { name: 'Hacked' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/pillars/00000000-0000-0000-0000-000000000000',
      payload: { name: 'Test' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('DELETE /v1/pillars/:id', () => {
  it('deletes an empty pillar', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie },
      payload: { name: 'ToDelete' },
    });

    const pillarId = createRes.json().pillar.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/pillars/${pillarId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('rejects deletion of a pillar with habits', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();
    const cookie = await registerAndGetCookie(app, email);

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/pillars',
      headers: { cookie },
      payload: { name: 'Health' },
    });

    const pillarId = createRes.json().pillar.id;

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
    });

    await prisma.habit.create({
      data: {
        name: 'Test habit',
        userId: user.id,
        pillarId,
      },
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/pillars/${pillarId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: 'Cannot delete pillar with associated habits. Archive or delete the habits first.',
    });

    await app.close();
  });

  it('returns 404 for a non-existent pillar', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/pillars/00000000-0000-0000-0000-000000000000',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/pillars/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
