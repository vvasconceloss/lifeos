import { buildApp } from '../../app';
import { cleanupTestUsers, createHabit, createPillar, markCompletion, registerAndGetCookieVerified, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

async function createGoal(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
  pillarId: string,
  title = 'Become a better engineer',
) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/goals',
    headers: { cookie },
    payload: { title, pillarId },
  });
  return res;
}

describe('Goal CRUD', () => {
  it('creates a goal', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/goals',
      headers: { cookie },
      payload: { title: 'Become a better engineer', pillarId, deadline: '2026-12-31' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().goal).toMatchObject({
      title: 'Become a better engineer',
      pillarName: 'Engineering',
      status: 'ACTIVE',
      deadline: '2026-12-31',
      progress: 0,
      habitCount: 0,
    });

    await app.close();
  });

  it('rejects a non-existent pillar', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/goals',
      headers: { cookie },
      payload: { title: 'Goal', pillarId: '00000000-0000-0000-0000-000000000000' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('lists goals with pillar info', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    await createGoal(app, cookie, pillarId, 'Run a marathon');

    const response = await app.inject({
      method: 'GET',
      url: '/v1/goals',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().goals).toHaveLength(1);
    expect(response.json().goals[0]).toMatchObject({ title: 'Run a marathon', pillarName: 'Health' });

    await app.close();
  });

  it('updates a goal and sets completedAt when completed', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const goalId = (await createGoal(app, cookie, pillarId)).json().goal.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/goals/${goalId}`,
      headers: { cookie },
      payload: { title: 'Renamed', status: 'COMPLETED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().goal).toMatchObject({ title: 'Renamed', status: 'COMPLETED' });
    expect(response.json().goal.completedAt).toBeTruthy();

    await app.close();
  });

  it('deletes a goal', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const goalId = (await createGoal(app, cookie, pillarId)).json().goal.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/goals/${goalId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });
});

describe('Goal habit association', () => {
  it('associates and disassociates habits', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const goalId = (await createGoal(app, cookie, pillarId)).json().goal.id;
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const add = await app.inject({
      method: 'PUT',
      url: `/v1/goals/${goalId}/habits/${habitId}`,
      headers: { cookie },
    });
    expect(add.statusCode).toBe(200);
    expect(add.json()).toEqual({ habitCount: 1 });

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/goals/${goalId}`,
      headers: { cookie },
    });
    expect(detail.json().goal.habits).toHaveLength(1);
    expect(detail.json().goal.progressHistory).toHaveLength(8);

    const remove = await app.inject({
      method: 'DELETE',
      url: `/v1/goals/${goalId}/habits/${habitId}`,
      headers: { cookie },
    });
    expect(remove.statusCode).toBe(200);
    expect(remove.json()).toEqual({ habitCount: 0 });

    await app.close();
  });

  it('rejects associating another user\'s habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookieVerified(app, uniqueEmail());
    const cookieB = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Health');
    const goalId = (await createGoal(app, cookieA, pillarA)).json().goal.id;
    const pillarB = await createPillar(app, cookieB, 'Health');
    const habitB = await createHabit(app, cookieB, 'Run', pillarB);

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/goals/${goalId}/habits/${habitB}`,
      headers: { cookie: cookieA },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects a habit from a different pillar than the goal', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const healthId = await createPillar(app, cookie, 'Health');
    const engId = await createPillar(app, cookie, 'Engineering');
    const goalId = (await createGoal(app, cookie, healthId)).json().goal.id;
    const habitId = await createHabit(app, cookie, 'Code', engId);

    const response = await app.inject({
      method: 'PUT',
      url: `/v1/goals/${goalId}/habits/${habitId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('derives progress from associated habit completions', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const goalId = (await createGoal(app, cookie, pillarId)).json().goal.id;
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await app.inject({
      method: 'PUT',
      url: `/v1/goals/${goalId}/habits/${habitId}`,
      headers: { cookie },
    });

    const now = new Date();
    await markCompletion(app, cookie, habitId, utcDateKey(now));
    await markCompletion(app, cookie, habitId, utcDateKey(new Date(Date.now() - 86400000)));

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/goals/${goalId}`,
      headers: { cookie },
    });

    const { goal } = detail.json();
    expect(goal.progress).toBeGreaterThan(0);
    expect(goal.habits[0]).toMatchObject({ habitName: 'Run', rate: expect.any(Number) });
    expect(goal.progressHistory[goal.progressHistory.length - 1].progress).toBeGreaterThan(0);

    await app.close();
  });

  it('computes progress since the habit was linked, not since its creation', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const goalId = (await createGoal(app, cookie, pillarId)).json().goal.id;
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await markCompletion(app, cookie, habitId, utcDateKey(new Date(Date.now() - 86400000)));

    const add = await app.inject({
      method: 'PUT',
      url: `/v1/goals/${goalId}/habits/${habitId}`,
      headers: { cookie },
    });
    expect(add.statusCode).toBe(200);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/goals/${goalId}`,
      headers: { cookie },
    });

    expect(detail.json().goal.progress).toBe(0);

    await app.close();
  });
});

describe('Goal isolation', () => {
  it('prevents another user from reading or mutating a goal', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookieVerified(app, uniqueEmail());
    const cookieB = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Health');
    const goalId = (await createGoal(app, cookieA, pillarA)).json().goal.id;

    const get = await app.inject({ method: 'GET', url: `/v1/goals/${goalId}`, headers: { cookie: cookieB } });
    expect(get.statusCode).toBe(404);

    const patch = await app.inject({ method: 'PATCH', url: `/v1/goals/${goalId}`, headers: { cookie: cookieB }, payload: { title: 'Hacked' } });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({ method: 'DELETE', url: `/v1/goals/${goalId}`, headers: { cookie: cookieB } });
    expect(del.statusCode).toBe(404);

    const stillThere = await app.inject({ method: 'GET', url: `/v1/goals/${goalId}`, headers: { cookie: cookieA } });
    expect(stillThere.statusCode).toBe(200);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({ method: 'GET', url: '/v1/goals' });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
