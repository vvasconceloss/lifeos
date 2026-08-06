import { buildApp } from '../../app';
import { cleanupTestUsers, createHabit, createPillar, markCompletion, registerAndGetCookie, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

const TODAY = utcDateKey(new Date());

describe('DailyLog CRUD', () => {
  it('creates (upserts) a log for a date', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/daily-logs',
      headers: { cookie },
      payload: { date: TODAY, mood: 7, energy: 8, sleepHours: 7.5, notes: 'Good day' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().log).toMatchObject({
      date: TODAY,
      mood: 7,
      energy: 8,
      sleepHours: 7.5,
      notes: 'Good day',
    });

    await app.close();
  });

  it('is idempotent for the same date', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    await app.inject({
      method: 'POST',
      url: '/v1/daily-logs',
      headers: { cookie },
      payload: { date: TODAY, mood: 5 },
    });

    const second = await app.inject({
      method: 'POST',
      url: '/v1/daily-logs',
      headers: { cookie },
      payload: { date: TODAY, mood: 9, sleepHours: 8 },
    });

    expect(second.statusCode).toBe(200);
    expect(second.json().log).toMatchObject({ date: TODAY, mood: 9, sleepHours: 8 });

    const logs = await app.inject({ method: 'GET', url: `/v1/daily-logs?from=${TODAY}&to=${TODAY}`, headers: { cookie } });
    expect(logs.json().logs).toHaveLength(1);

    await app.close();
  });

  it('lists logs within a range and fetches by date', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    await app.inject({ method: 'POST', url: '/v1/daily-logs', headers: { cookie }, payload: { date: TODAY, mood: 6 } });

    const list = await app.inject({ method: 'GET', url: `/v1/daily-logs?from=${TODAY}&to=${TODAY}`, headers: { cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json().logs).toHaveLength(1);

    const byDate = await app.inject({ method: 'GET', url: `/v1/daily-logs/${TODAY}`, headers: { cookie } });
    expect(byDate.statusCode).toBe(200);
    expect(byDate.json().log.mood).toBe(6);

    await app.close();
  });

  it('updates and deletes a log', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const created = await app.inject({ method: 'POST', url: '/v1/daily-logs', headers: { cookie }, payload: { date: TODAY, mood: 3 } });
    const logId = created.json().log.id;

    const patch = await app.inject({ method: 'PATCH', url: `/v1/daily-logs/${logId}`, headers: { cookie }, payload: { mood: 8, notes: 'Better' } });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().log).toMatchObject({ mood: 8, notes: 'Better' });

    const del = await app.inject({ method: 'DELETE', url: `/v1/daily-logs/${logId}`, headers: { cookie } });
    expect(del.statusCode).toBe(204);

    await app.close();
  });

  it('rejects a future date', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const future = utcDateKey(new Date(Date.now() + 3 * 86400000));

    const response = await app.inject({
      method: 'POST',
      url: '/v1/daily-logs',
      headers: { cookie },
      payload: { date: future, mood: 8 },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({ method: 'GET', url: '/v1/daily-logs' });
    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('DailyLog correlations', () => {
  it('groups daily completion rate by sleep, mood and energy', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitA = await createHabit(app, cookie, 'Run', pillarId);
    const habitB = await createHabit(app, cookie, 'Read', pillarId);

    await markCompletion(app, cookie, habitA, TODAY);
    await markCompletion(app, cookie, habitB, TODAY);

    await app.inject({
      method: 'POST',
      url: '/v1/daily-logs',
      headers: { cookie },
      payload: { date: TODAY, mood: 8, energy: 7, sleepHours: 7.5 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/daily-logs/correlations?from=${TODAY}&to=${TODAY}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { correlations } = response.json();
    expect(correlations.sleep).toContainEqual({ label: '7–9h', rate: 100, days: 1 });
    expect(correlations.mood).toContainEqual({ label: '8–10', rate: 100, days: 1 });
    expect(correlations.energy).toContainEqual({ label: '5–7', rate: 100, days: 1 });

    await app.close();
  });
});

describe('DailyLog isolation', () => {
  it('prevents another user from mutating a log', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());

    const created = await app.inject({ method: 'POST', url: '/v1/daily-logs', headers: { cookie: cookieA }, payload: { date: TODAY, mood: 4 } });
    const logId = created.json().log.id;

    const get = await app.inject({ method: 'GET', url: `/v1/daily-logs/${TODAY}`, headers: { cookie: cookieB } });
    expect(get.statusCode).toBe(404);

    const patch = await app.inject({ method: 'PATCH', url: `/v1/daily-logs/${logId}`, headers: { cookie: cookieB }, payload: { mood: 9 } });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({ method: 'DELETE', url: `/v1/daily-logs/${logId}`, headers: { cookie: cookieB } });
    expect(del.statusCode).toBe(404);

    const stillThere = await app.inject({ method: 'GET', url: `/v1/daily-logs/${TODAY}`, headers: { cookie: cookieA } });
    expect(stillThere.statusCode).toBe(200);

    await app.close();
  });
});
