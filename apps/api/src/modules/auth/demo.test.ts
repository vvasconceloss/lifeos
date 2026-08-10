import { buildApp } from '../../app';
import { prisma } from '../../db/client';
import { DEMO_EMAIL } from './demo.service';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

async function cleanupDemo(): Promise<void> {
  const demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (demo) {
    await prisma.goalHabit.deleteMany({ where: { goal: { userId: demo.id } } });
    await prisma.goal.deleteMany({ where: { userId: demo.id } });
    await prisma.projectTask.deleteMany({ where: { project: { userId: demo.id } } });
    await prisma.project.deleteMany({ where: { userId: demo.id } });
    await prisma.habitCompletion.deleteMany({ where: { habit: { userId: demo.id } } });
    await prisma.dailyLog.deleteMany({ where: { userId: demo.id } });
    await prisma.habit.deleteMany({ where: { userId: demo.id } });
    await prisma.pillar.deleteMany({ where: { userId: demo.id } });
    await prisma.user.delete({ where: { id: demo.id } });
  }
}

describe('POST /v1/auth/demo', () => {
  beforeAll(cleanupDemo);
  afterAll(cleanupDemo);

  it('logs into a seeded demo account', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/demo',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user).toMatchObject({ email: DEMO_EMAIL, name: 'Demo User', onboarded: true, gamification: true });
    expect(body.token).toBeTruthy();
    const tokenCookie = response.cookies.find((c) => c.name === 'token');
    expect(tokenCookie?.value).toBeTruthy();

    await app.close();
  });

  it('seeds sample data on the demo account', async () => {
    const app = await buildApp({ csrf: false });

    await app.inject({ method: 'POST', url: '/v1/auth/demo' });
    const demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    expect(demo).not.toBeNull();

    const [pillars, habits, goals, projects, completions, logs] = await Promise.all([
      prisma.pillar.count({ where: { userId: demo!.id } }),
      prisma.habit.count({ where: { userId: demo!.id } }),
      prisma.goal.count({ where: { userId: demo!.id } }),
      prisma.project.count({ where: { userId: demo!.id } }),
      prisma.habitCompletion.count({ where: { habit: { userId: demo!.id } } }),
      prisma.dailyLog.count({ where: { userId: demo!.id } }),
    ]);

    expect(pillars).toBeGreaterThanOrEqual(3);
    expect(habits).toBeGreaterThanOrEqual(3);
    expect(goals).toBeGreaterThanOrEqual(2);
    expect(projects).toBeGreaterThanOrEqual(1);
    expect(completions).toBeGreaterThan(0);
    expect(logs).toBeGreaterThan(0);

    await app.close();
  });

  it('returns a consistent account across calls', async () => {
    const app = await buildApp({ csrf: false });

    const first = await app.inject({ method: 'POST', url: '/v1/auth/demo' });
    const second = await app.inject({ method: 'POST', url: '/v1/auth/demo' });

    expect(first.json().user.id).toBe(second.json().user.id);

    await app.close();
  });

  it('requires no body and is unauthenticated-friendly', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/demo',
      payload: {},
    });

    expect(response.statusCode).toBe(200);

    await app.close();
  });
});
