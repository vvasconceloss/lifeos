import { buildApp } from './app';
import { cleanupTestUsers, createHabit, createPillar, uniqueEmail } from '../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

describe('E2E: main flow', () => {
  it('register → onboarding → habit → completion → dashboard → statistics → goal progress', async () => {
    const app = await buildApp({ csrf: false });
    const email = uniqueEmail();

    // 1. Register a brand-new account
    const registerRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email, password: 'test1234' },
    });
    expect(registerRes.statusCode).toBe(201);
    const tokenCookie = registerRes.cookies.find((c) => c.name === 'token');
    const cookie = `token=${tokenCookie!.value}`;

    // 2. Onboarding creates the first pillar
    const onboardingRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/onboarding',
      headers: { cookie },
      payload: { pillars: [{ name: 'Health', color: '#ef4444', icon: '❤️' }], habits: [] },
    });
    expect(onboardingRes.statusCode).toBe(201);

    const pillarsRes = await app.inject({ method: 'GET', url: '/v1/pillars', headers: { cookie } });
    const pillarId = pillarsRes.json().pillars[0].id;
    expect(pillarId).toBeTruthy();

    // 3. Create a habit
    const habitRes = await app.inject({
      method: 'POST',
      url: '/v1/habits',
      headers: { cookie },
      payload: { name: 'Morning run', pillarId },
    });
    expect(habitRes.statusCode).toBe(201);
    const habitId = habitRes.json().habit.id;

    // 4. Complete the habit today
    const today = utcDateKey(new Date());
    const completeRes = await app.inject({
      method: 'PUT',
      url: `/v1/habits/${habitId}/completions/${today}`,
      headers: { cookie },
    });
    expect(completeRes.statusCode).toBe(200);

    // 5. Dashboard (overview) reflects the progress
    const now = new Date();
    const overviewRes = await app.inject({
      method: 'GET',
      url: `/v1/stats/overview?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`,
      headers: { cookie },
    });
    expect(overviewRes.statusCode).toBe(200);
    const overview = overviewRes.json().stats;
    expect(overview.totalCompletions).toBeGreaterThanOrEqual(1);
    expect(overview.pillarStats[0]).toMatchObject({ pillarName: 'Health', completed: 1 });

    // 6. Statistics (analytics) reflects the completion in the current week/month
    const analyticsRes = await app.inject({ method: 'GET', url: '/v1/stats/analytics', headers: { cookie } });
    expect(analyticsRes.statusCode).toBe(200);
    const { stats } = analyticsRes.json();
    expect(stats.weeklyRates[stats.weeklyRates.length - 1].completed).toBeGreaterThan(0);
    expect(stats.monthlyRates[stats.monthlyRates.length - 1].completed).toBeGreaterThan(0);

    // 7. Goal linked to the habit reflects derived progress
    const goalRes = await app.inject({
      method: 'POST',
      url: '/v1/goals',
      headers: { cookie },
      payload: { title: 'Run consistently', pillarId },
    });
    expect(goalRes.statusCode).toBe(201);
    const goalId = goalRes.json().goal.id;
    const linkRes = await app.inject({
      method: 'PUT',
      url: `/v1/goals/${goalId}/habits/${habitId}`,
      headers: { cookie },
    });
    expect(linkRes.statusCode).toBe(200);
    const goalDetailRes = await app.inject({ method: 'GET', url: `/v1/goals/${goalId}`, headers: { cookie } });
    expect(goalDetailRes.statusCode).toBe(200);
    expect(goalDetailRes.json().goal.progress).toBeGreaterThan(0);

    await app.close();
  });
});

describe('E2E: cross-user isolation', () => {
  it('register A and B — B cannot read or mutate A\'s data', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndCookie(app, uniqueEmail());
    const cookieB = await registerAndCookie(app, uniqueEmail());

    // A creates private data
    const pillarA = await createPillar(app, cookieA, 'Health');
    const habitA = await createHabit(app, cookieA, 'Secret', pillarA);

    // B must not read or mutate A's data
    const attempts: { method: 'GET' | 'PATCH' | 'DELETE'; url: string; payload?: object }[] = [
      { method: 'GET', url: `/v1/pillars/${pillarA}` },
      { method: 'PATCH', url: `/v1/pillars/${pillarA}`, payload: { name: 'Hacked' } },
      { method: 'DELETE', url: `/v1/pillars/${pillarA}` },
      { method: 'GET', url: `/v1/habits/${habitA}` },
      { method: 'PATCH', url: `/v1/habits/${habitA}`, payload: { name: 'Hacked' } },
      { method: 'DELETE', url: `/v1/habits/${habitA}` },
    ];

    for (const attempt of attempts) {
      const res = await app.inject({
        method: attempt.method,
        url: attempt.url,
        headers: { cookie: cookieB },
        ...(attempt.payload ? { payload: attempt.payload } : {}),
      });
      expect(res.statusCode).toBe(404);
    }

    // A's data is untouched
    const pillarsRes = await app.inject({ method: 'GET', url: '/v1/pillars', headers: { cookie: cookieA } });
    expect(pillarsRes.json().pillars).toHaveLength(1);
    const habitsRes = await app.inject({ method: 'GET', url: '/v1/habits', headers: { cookie: cookieA } });
    expect(habitsRes.json().habits).toHaveLength(1);

    await app.close();
  });
});

async function registerAndCookie(
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password: 'test1234' },
  });
  const tokenCookie = res.cookies.find((c) => c.name === 'token');
  return `token=${tokenCookie!.value}`;
}
