import { buildApp } from '../../app';
import {
  buildDailyKeySet,
  buildHeatmapDays,
  calculateCompletionRate,
  classifyIntensity,
  getBestStreak,
  getCurrentStreak,
  getDaysInYear,
  getMonthReference,
  toDateKey,
} from './stats.utils';
import { cleanupTestUsers, createHabit, createPillar, markCompletion, registerAndGetCookieVerified, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

const TODAY = utcDateKey(new Date());
const YESTERDAY = utcDateKey(new Date(Date.now() - 86400000));

describe('stats.utils', () => {
  describe('getCurrentStreak', () => {
    it('returns 0 when there is no history', () => {
      const keys = new Set<string>();
      expect(getCurrentStreak(keys, new Date(TODAY + 'T00:00:00.000Z'))).toBe(0);
    });

    it('counts consecutive days ending today', () => {
      const keys = new Set([YESTERDAY, TODAY]);
      expect(getCurrentStreak(keys, new Date(TODAY + 'T00:00:00.000Z'))).toBe(2);
    });

    it('counts up to yesterday when today is not completed', () => {
      const keys = new Set([YESTERDAY]);
      expect(getCurrentStreak(keys, new Date(TODAY + 'T00:00:00.000Z'))).toBe(1);
    });

    it('returns 0 when the streak is broken', () => {
      const keys = new Set([YESTERDAY, toDateKey(new Date(Date.now() - 3 * 86400000))]);
      expect(getCurrentStreak(keys, new Date(TODAY + 'T00:00:00.000Z'))).toBe(1);
    });
  });

  describe('getBestStreak', () => {
    it('returns 0 when there is no history', () => {
      expect(getBestStreak(new Set())).toBe(0);
    });

    it('returns 1 for a single completion', () => {
      const keys = new Set([TODAY]);
      expect(getBestStreak(keys)).toBe(1);
    });

    it('returns the longest historical run even when broken', () => {
      const keys = new Set([
        '2026-06-01',
        '2026-06-02',
        '2026-06-03',
        '2026-06-10',
        '2026-06-11',
      ]);
      expect(getBestStreak(keys)).toBe(3);
    });
  });

  describe('getMonthReference', () => {
    it('returns today for the current month', () => {
      const now = new Date();
      const ref = getMonthReference(now.getUTCFullYear(), now.getUTCMonth() + 1);
      expect(toDateKey(ref)).toBe(toDateKey(now));
    });

    it('returns the last day of the month for past months', () => {
      expect(toDateKey(getMonthReference(2026, 6))).toBe('2026-06-30');
    });
  });

  describe('classifyIntensity', () => {
    it('returns 0 for no completions', () => {
      expect(classifyIntensity(0)).toBe(0);
    });

    it('returns 1 for a single completion', () => {
      expect(classifyIntensity(1)).toBe(1);
    });

    it('returns 2 for two completions', () => {
      expect(classifyIntensity(2)).toBe(2);
    });

    it('returns 3 for three or more completions', () => {
      expect(classifyIntensity(3)).toBe(3);
      expect(classifyIntensity(8)).toBe(3);
    });
  });

  describe('buildHeatmapDays', () => {
    it('returns an entry for every day of the month', () => {
      expect(buildHeatmapDays([], 2026, 6).days).toHaveLength(30);
    });

    it('returns zero counts for a month with no completions', () => {
      const result = buildHeatmapDays([], 2026, 6);
      expect(result.maxCount).toBe(0);
      expect(result.days.every((d) => d.count === 0 && d.level === 0)).toBe(true);
    });

    it('counts completions per day and classifies intensity', () => {
      const result = buildHeatmapDays(
        [
          new Date('2026-06-01T00:00:00.000Z'),
          new Date('2026-06-01T00:00:00.000Z'),
          new Date('2026-06-02T00:00:00.000Z'),
        ],
        2026,
        6,
      );

      expect(result.days[0]).toMatchObject({ date: '2026-06-01', count: 2, level: 2 });
      expect(result.days[1]).toMatchObject({ date: '2026-06-02', count: 1, level: 1 });
      expect(result.days[2]).toMatchObject({ date: '2026-06-03', count: 0, level: 0 });
      expect(result.maxCount).toBe(2);
    });

    it('ignores completions outside the selected month', () => {
      const result = buildHeatmapDays(
        [
          new Date('2026-05-31T00:00:00.000Z'),
          new Date('2026-07-01T00:00:00.000Z'),
        ],
        2026,
        6,
      );

      expect(result.days.every((d) => d.count === 0)).toBe(true);
    });

    it('builds the full year when month is null', () => {
      expect(buildHeatmapDays([], 2026, null).days).toHaveLength(getDaysInYear(2026));
      expect(buildHeatmapDays([], 2024, null).days).toHaveLength(getDaysInYear(2024));
    });
  });

  describe('calculateCompletionRate', () => {
    it('returns 0 when expected is zero', () => {
      expect(calculateCompletionRate(5, null, 0)).toBe(0);
    });

    it('computes the ratio rounded to a percentage', () => {
      expect(calculateCompletionRate(5, null, 7)).toBe(71);
    });

    it('caps at 100 when exceeding the goal', () => {
      expect(calculateCompletionRate(10, 7, 31)).toBe(100);
    });

    it('uses the monthly goal when defined', () => {
      expect(calculateCompletionRate(3, 4, 31)).toBe(75);
    });
  });

  describe('buildDailyKeySet', () => {
    it('filters out future dates beyond the reference', () => {
      const maxDate = new Date(TODAY + 'T00:00:00.000Z');
      const future = new Date('2099-12-31T00:00:00.000Z');
      const keys = buildDailyKeySet([maxDate, future], maxDate);

      expect(keys.size).toBe(1);
      expect(keys.has(TODAY)).toBe(true);
      expect(keys.has('2099-12-31')).toBe(false);
    });
  });
});

describe('GET /v1/stats/monthly', () => {
  it('returns monthly stats with no habits', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/monthly',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().stats).toMatchObject({
      dailyCounts: [],
      habitProgress: [],
      totalCompletions: 0,
      successRate: 0,
    });

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/monthly',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /v1/stats/overview', () => {
  it('returns habit and pillar stats', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await markCompletion(app, cookie, habitId, TODAY);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/overview',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { stats } = response.json();
    expect(stats.totalCompletions).toBe(1);
    expect(stats.habitStats).toHaveLength(1);
    expect(stats.habitStats[0]).toMatchObject({
      habitId,
      habitName: 'Run',
      currentStreak: 1,
      bestStreak: 1,
    });
    expect(stats.pillarStats).toHaveLength(1);
    expect(stats.pillarStats[0]).toMatchObject({
      pillarId,
      pillarName: 'Health',
      activeHabitCount: 1,
      completed: 1,
    });

    await app.close();
  });

  it('scopes streaks to the selected month', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const now = new Date();
    const prevMonthLast = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    const prevDay3 = utcDateKey(prevMonthLast);
    const prevDay2 = utcDateKey(new Date(prevMonthLast.getTime() - 86400000));
    const prevDay1 = utcDateKey(new Date(prevMonthLast.getTime() - 2 * 86400000));

    await markCompletion(app, cookie, habitId, prevDay1);
    await markCompletion(app, cookie, habitId, prevDay2);
    await markCompletion(app, cookie, habitId, prevDay3);
    await markCompletion(app, cookie, habitId, TODAY);

    const currentMonthIdx = now.getUTCMonth();
    const prevMonthIdx = (currentMonthIdx + 11) % 12;
    const prevYear = currentMonthIdx === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();

    const past = await app.inject({
      method: 'GET',
      url: `/v1/stats/overview?year=${prevYear}&month=${prevMonthIdx + 1}`,
      headers: { cookie },
    });
    expect(past.statusCode).toBe(200);
    expect(past.json().stats.habitStats[0]).toMatchObject({
      habitId,
      currentStreak: 3,
      bestStreak: 3,
    });

    const current = await app.inject({
      method: 'GET',
      url: '/v1/stats/overview',
      headers: { cookie },
    });
    expect(current.statusCode).toBe(200);
    expect(current.json().stats.habitStats[0].bestStreak).toBe(1);

    await app.close();
  });

  it('respects user isolation', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookieVerified(app, uniqueEmail());
    const cookieB = await registerAndGetCookieVerified(app, uniqueEmail());

    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Run', pillarA);
    await markCompletion(app, cookieA, habitA, TODAY);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/overview',
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().stats).toMatchObject({
      totalCompletions: 0,
      habitStats: [],
      pillarStats: [],
    });

    await app.close();
  });

  it('computes the current-month rate over the elapsed days only', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    for (let day = 1; day <= now.getUTCDate(); day++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      await markCompletion(app, cookie, habitId, key);
    }

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/overview',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { stats } = response.json();
    expect(stats.totalCompletions).toBe(now.getUTCDate());
    expect(stats.successRate).toBe(100);
    expect(stats.pillarStats[0]).toMatchObject({
      pillarName: 'Health',
      completed: now.getUTCDate(),
      total: now.getUTCDate(),
      completionRate: 100,
    });
    expect(stats.habitStats[0].completionRate).toBe(100);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/overview',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /v1/stats/habits/:id', () => {
  it('returns stats for a habit owned by the user', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitId = await createHabit(app, cookie, 'Run', pillarId);

    await markCompletion(app, cookie, habitId, YESTERDAY);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/stats/habits/${habitId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().stats).toMatchObject({
      habitId,
      habitName: 'Run',
      currentStreak: 1,
      bestStreak: 1,
    });

    await app.close();
  });

  it('returns 404 for a habit owned by another user', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookieVerified(app, uniqueEmail());
    const cookieB = await registerAndGetCookieVerified(app, uniqueEmail());

    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Run', pillarA);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/stats/habits/${habitA}`,
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/habits/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('GET /v1/stats/heatmap', () => {
  it('returns daily counts with intensity levels for a month', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitA = await createHabit(app, cookie, 'Run', pillarId);
    const habitB = await createHabit(app, cookie, 'Read', pillarId);

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const todayKey = utcDateKey(now);

    await markCompletion(app, cookie, habitA, todayKey);
    await markCompletion(app, cookie, habitB, todayKey);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/stats/heatmap?year=${year}&month=${month}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { stats } = response.json();
    expect(stats.month).toBe(month);
    expect(stats.days).toHaveLength(
      new Date(Date.UTC(year, month, 0)).getUTCDate(),
    );

    const today = stats.days.find((d: { date: string }) => d.date === todayKey);
    expect(today).toMatchObject({ count: 2, level: 2 });

    await app.close();
  });

  it('aggregates the full year when month is omitted', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    const habitA = await createHabit(app, cookie, 'Run', pillarId);

    const now = new Date();
    const year = now.getUTCFullYear();
    const daysInYear = getDaysInYear(year);

    let marks = 0;
    for (let day = 1; day <= now.getUTCDate(); day++) {
      const key = `${year}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      await markCompletion(app, cookie, habitA, key);
      marks++;
    }

    const response = await app.inject({
      method: 'GET',
      url: `/v1/stats/heatmap?year=${year}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const { stats } = response.json();
    expect(stats.month).toBeNull();
    expect(stats.days).toHaveLength(daysInYear);
    expect(stats.days.reduce((sum: number, d: { count: number }) => sum + d.count, 0)).toBe(marks);

    await app.close();
  });

  it('respects user isolation', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookieVerified(app, uniqueEmail());
    const cookieB = await registerAndGetCookieVerified(app, uniqueEmail());

    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Run', pillarA);
    await markCompletion(app, cookieA, habitA, TODAY);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/stats/heatmap?year=${new Date().getUTCFullYear()}&month=${new Date().getUTCMonth() + 1}`,
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().stats.days.every((d: { count: number }) => d.count === 0)).toBe(true);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/heatmap',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe('input validation', () => {
  it('rejects an invalid year in the overview query', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/overview?year=not-a-year',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { message: 'Validation failed' } });

    await app.close();
  });

  it('rejects an invalid month in the heatmap query', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/heatmap?year=2026&month=13',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('rejects a non-uuid habit id in the stats detail', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookieVerified(app, uniqueEmail());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/stats/habits/not-a-uuid',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
