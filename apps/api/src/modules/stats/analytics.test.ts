import { buildApp } from '../../app';
import { cleanupTestUsers, createHabit, createPillar, markCompletion, registerAndGetCookie, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

describe('GET /v1/stats/analytics', () => {
  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/analytics',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns empty analytics for a user without habits', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/analytics',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { stats } = response.json();
    expect(stats.weeks).toBe(12);
    expect(stats.weeklyRates).toHaveLength(12);
    expect(stats.monthlyRates).toHaveLength(6);
    expect(stats.streakHistory).toHaveLength(6);
    expect(stats.consistency).toBe(0);
    expect(stats.dailyAverage).toBe(0);
    expect(stats.habitConsistency).toEqual([]);
    expect(stats.trend.direction).toBe('stable');

    await app.close();
  });

  it('reflects recent completions in the weekly rate', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const now = new Date();
    await markCompletion(app, cookie, habitId, utcDateKey(now));
    await markCompletion(app, cookie, habitId, utcDateKey(new Date(Date.now() - 86400000)));
    await markCompletion(app, cookie, habitId, utcDateKey(new Date(Date.now() - 2 * 86400000)));

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/analytics',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { stats } = response.json();

    const currentWeek = stats.weeklyRates[stats.weeklyRates.length - 1];
    expect(currentWeek.completed).toBeGreaterThan(0);
    expect(currentWeek.expected).toBeGreaterThan(0);
    expect(currentWeek.rate).toBeGreaterThan(0);
    // current week must never be in the future
    expect(currentWeek.to <= utcDateKey(now)).toBe(true);

    expect(stats.habitConsistency).toHaveLength(1);
    expect(stats.habitConsistency[0]).toMatchObject({ habitName: 'Run', rate: expect.any(Number) });
    expect(stats.streakHistory[stats.streakHistory.length - 1].bestStreak).toBeGreaterThanOrEqual(1);
    expect(stats.pillarStats[0]).toMatchObject({ pillarName: 'Health' });

    await app.close();
  });

  it('honours the weeks query parameter', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/analytics?weeks=6',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().stats.weeks).toBe(6);
    expect(response.json().stats.weeklyRates).toHaveLength(6);

    await app.close();
  });

  it('rejects an invalid weeks value', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/analytics?weeks=999',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
