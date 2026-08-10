import { buildApp } from './app';
import { cleanupTestUsers, uniqueEmail } from '../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

describe('E2E: main flow', () => {
  it('register → create pillar → create habit → complete habit → dashboard reflects progress', async () => {
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
      payload: {
        pillars: [{ name: 'Health', color: '#ef4444', icon: '❤️' }],
        habits: [],
      },
    });
    expect(onboardingRes.statusCode).toBe(201);

    const pillarsRes = await app.inject({
      method: 'GET',
      url: '/v1/pillars',
      headers: { cookie },
    });
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

    // 5. The dashboard (overview) reflects the progress
    const now = new Date();
    const overviewRes = await app.inject({
      method: 'GET',
      url: `/v1/stats/overview?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`,
      headers: { cookie },
    });
    expect(overviewRes.statusCode).toBe(200);
    const overview = overviewRes.json().stats;
    expect(overview.totalCompletions).toBeGreaterThanOrEqual(1);
    expect(overview.successRate).toBeGreaterThan(0);
    expect(overview.pillarStats[0]).toMatchObject({
      pillarName: 'Health',
      completed: 1,
    });
    expect(overview.pillarStats[0].completionRate).toBeGreaterThan(0);

    // The habit's own history shows the completion
    const historyRes = await app.inject({
      method: 'GET',
      url: `/v1/habits/${habitId}/history?from=${today}&to=${today}`,
      headers: { cookie },
    });
    expect(historyRes.statusCode).toBe(200);
    expect(historyRes.json().history.days[0]).toMatchObject({
      date: today,
      scheduled: true,
      completed: true,
    });

    await app.close();
  });
});
