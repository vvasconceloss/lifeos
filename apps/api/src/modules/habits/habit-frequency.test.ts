import { buildApp } from '../../app';
import { cleanupTestUsers, createHabit, createPillar, markCompletion, registerAndGetCookie, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

const TODAY = utcDateKey(new Date());
const YESTERDAY = utcDateKey(new Date(Date.now() - 86400000));

describe('habit frequency create/update', () => {
  it('creates a WEEKLY_DAYS habit with daysOfWeek', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Read', pillarId, frequency: 'WEEKLY_DAYS', daysOfWeek: [1, 3, 5] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().habit).toMatchObject({
      frequency: 'WEEKLY_DAYS',
      daysOfWeek: [1, 3, 5],
      timesPerWeek: null,
      timesPerMonth: null,
    });

    await app.close();
  });

  it('creates TIMES_PER_WEEK and TIMES_PER_MONTH habits', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const weekly = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Train', pillarId, frequency: 'TIMES_PER_WEEK', timesPerWeek: 4 },
    });
    expect(weekly.statusCode).toBe(201);
    expect(weekly.json().habit).toMatchObject({ frequency: 'TIMES_PER_WEEK', timesPerWeek: 4 });

    const monthly = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Meditate', pillarId, frequency: 'TIMES_PER_MONTH', timesPerMonth: 12 },
    });
    expect(monthly.statusCode).toBe(201);
    expect(monthly.json().habit).toMatchObject({ frequency: 'TIMES_PER_MONTH', timesPerMonth: 12 });

    await app.close();
  });

  it('defaults to DAILY when frequency is omitted', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Run', pillarId },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().habit).toMatchObject({ frequency: 'DAILY', daysOfWeek: [] });

    await app.close();
  });

  it('rejects a WEEKLY_DAYS habit without daysOfWeek', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Read', pillarId, frequency: 'WEEKLY_DAYS' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Validation failed' });

    await app.close();
  });

  it('rejects a TIMES_PER_WEEK habit without timesPerWeek', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Train', pillarId, frequency: 'TIMES_PER_WEEK' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects duplicate daysOfWeek', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Read', pillarId, frequency: 'WEEKLY_DAYS', daysOfWeek: [1, 1] },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects an invalid day index', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Read', pillarId, frequency: 'WEEKLY_DAYS', daysOfWeek: [7] },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects changing frequency without its parameter on PATCH', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/habits/${habitId}`,
      headers: { cookie },
      payload: { frequency: 'TIMES_PER_WEEK' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('updates frequency together with its parameter', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/habits/${habitId}`,
      headers: { cookie },
      payload: { frequency: 'WEEKLY_DAYS', daysOfWeek: [0, 6] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().habit).toMatchObject({ frequency: 'WEEKLY_DAYS', daysOfWeek: [0, 6] });

    await app.close();
  });
});

describe('GET /v1/habits/:id/history', () => {
  it('returns a day map, aggregates and period comparison', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await markCompletion(app, cookie, habitId, TODAY);
    await markCompletion(app, cookie, habitId, YESTERDAY);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/habits/${habitId}/history`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { history } = response.json();
    expect(history.habitId).toBe(habitId);
    expect(history.frequency).toBe('DAILY');
    expect(history.days).toHaveLength(30);
    expect(history.actual).toBe(2);
    expect(history.expected).toBe(30);
    expect(history.completionRate).toBe(7);
    expect(history.currentStreak).toBe(2);
    expect(history.comparison).toEqual({ current: 7, previous: 0, delta: 7 });

    await app.close();
  });

  it('supports an explicit range', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await markCompletion(app, cookie, habitId, '2026-06-01');

    const response = await app.inject({
      method: 'GET',
      url: `/v1/habits/${habitId}/history?from=2026-06-01&to=2026-06-10`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { history } = response.json();
    expect(history.days).toHaveLength(10);
    expect(history.actual).toBe(1);
    expect(history.expected).toBe(10);
    expect(history.days[0]).toMatchObject({ date: '2026-06-01', weekday: 1, scheduled: true, completed: true });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/habits/00000000-0000-0000-0000-000000000000/history',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 404 for another user\'s habit', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Secret', pillarA);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/habits/${habitA}/history`,
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});
