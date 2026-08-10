import { buildApp } from '../../app';
import { cleanupTestUsers, createHabit, createPillar, markCompletion, registerAndGetCookie, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

async function enableGamification(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
): Promise<void> {
  await app.inject({
    method: 'PATCH',
    url: '/v1/auth/me',
    headers: { cookie },
    payload: { gamification: true },
  });
}

async function getProgression(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
) {
  const res = await app.inject({
    method: 'GET',
    url: '/v1/progression',
    headers: { cookie },
  });
  return res.json().progression;
}

describe('POST /v1/auth/me gamification', () => {
  it('is disabled by default', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { cookie },
    });

    expect(me.json().user.gamification).toBe(false);

    await app.close();
  });

  it('can be toggled on and off', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const on = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      headers: { cookie },
      payload: { gamification: true },
    });
    expect(on.json().user.gamification).toBe(true);

    const off = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      headers: { cookie },
      payload: { gamification: false },
    });
    expect(off.json().user.gamification).toBe(false);

    await app.close();
  });
});

describe('GET /v1/progression', () => {
  it('returns disabled when gamification is off', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const progression = await getProgression(app, cookie);

    expect(progression).toEqual({ enabled: false, overall: null, pillars: [] });

    await app.close();
  });

  it('returns a zeroed, level-1 progression for an empty enabled account', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    await enableGamification(app, cookie);

    const progression = await getProgression(app, cookie);

    expect(progression.enabled).toBe(true);
    expect(progression.overall).toMatchObject({ level: 1, xp: 0, rank: 'E' });
    expect(progression.pillars).toHaveLength(0);

    await app.close();
  });

  it('awards habit XP from completions', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);
    await enableGamification(app, cookie);

    await markCompletion(app, cookie, habitId, utcDateKey(new Date()));
    await markCompletion(app, cookie, habitId, utcDateKey(new Date(Date.now() - 86400000)));

    const progression = await getProgression(app, cookie);

    expect(progression.pillars).toHaveLength(1);
    const pillar = progression.pillars[0];
    expect(pillar.pillarName).toBe('Health');
    expect(pillar.rates.habits).toBeGreaterThan(0);
    expect(pillar.breakdown.habits).toBeGreaterThan(0);
    expect(pillar.xp).toBeGreaterThan(0);
    expect(pillar.breakdown.goals).toBe(0);
    expect(pillar.breakdown.projects).toBe(0);
    expect(progression.overall.xp).toBe(pillar.xp);

    await app.close();
  });

  it('awards project XP from completed tasks', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');
    await enableGamification(app, cookie);

    const projectRes = await app.inject({
      method: 'POST',
      url: '/v1/projects',
      headers: { cookie },
      payload: { title: 'Landing page', pillarId },
    });
    const projectId = projectRes.json().project.id;
    const taskRes = await app.inject({
      method: 'POST',
      url: `/v1/projects/${projectId}/tasks`,
      headers: { cookie },
      payload: { title: 'Design' },
    });
    const taskId = taskRes.json().task.id;
    await app.inject({
      method: 'PATCH',
      url: `/v1/projects/tasks/${taskId}`,
      headers: { cookie },
      payload: { isDone: true },
    });

    const progression = await getProgression(app, cookie);

    const pillar = progression.pillars[0];
    expect(pillar.rates.projects).toBe(100);
    expect(pillar.breakdown.projects).toBe(2000);
    expect(pillar.xp).toBeGreaterThanOrEqual(2000);

    await app.close();
  });

  it('awards goal XP from goal progress', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Knowledge');
    await enableGamification(app, cookie);

    const goalRes = await app.inject({
      method: 'POST',
      url: '/v1/goals',
      headers: { cookie },
      payload: { title: 'Read more', pillarId },
    });
    const goalId = goalRes.json().goal.id;
    const habitId = await createHabit(app, cookie, 'Read', pillarId);
    await app.inject({
      method: 'PUT',
      url: `/v1/goals/${goalId}/habits/${habitId}`,
      headers: { cookie },
    });
    await markCompletion(app, cookie, habitId, utcDateKey(new Date()));

    const progression = await getProgression(app, cookie);

    const pillar = progression.pillars[0];
    expect(pillar.rates.goals).toBeGreaterThan(0);
    expect(pillar.breakdown.goals).toBeGreaterThan(0);

    await app.close();
  });

  it('scopes progression to the authenticated user', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Health');
    await createHabit(app, cookieA, 'Run', pillarA);
    await enableGamification(app, cookieA);
    await enableGamification(app, cookieB);

    const progA = await getProgression(app, cookieA);
    const progB = await getProgression(app, cookieB);

    expect(progA.pillars).toHaveLength(1);
    expect(progB.pillars).toHaveLength(0);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/progression',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
