import { buildApp } from '../../app';
import { cleanupTestUsers, createPillar, registerAndGetCookie, uniqueEmail } from '../../../test/helpers';
import { describe, expect, it, afterAll } from 'vitest';

afterAll(cleanupTestUsers);

async function createProject(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
  pillarId: string,
  title = 'Build the landing page',
) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/projects',
    headers: { cookie },
    payload: { title, pillarId },
  });
  return res;
}

async function addTask(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
  projectId: string,
  title = 'Design mockups',
) {
  const res = await app.inject({
    method: 'POST',
    url: `/v1/projects/${projectId}/tasks`,
    headers: { cookie },
    payload: { title },
  });
  return res;
}

describe('Project CRUD', () => {
  it('creates a project', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/projects',
      headers: { cookie },
      payload: { title: 'Build the landing page', pillarId, deadline: '2026-12-31' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().project).toMatchObject({
      title: 'Build the landing page',
      pillarName: 'Engineering',
      status: 'PLANNING',
      deadline: '2026-12-31',
      progress: 0,
      taskCount: 0,
    });

    await app.close();
  });

  it('rejects a non-existent pillar', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/projects',
      headers: { cookie },
      payload: { title: 'Project', pillarId: '00000000-0000-0000-0000-000000000000' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('lists projects with pillar info', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Health');
    await createProject(app, cookie, pillarId, 'Run a marathon');

    const response = await app.inject({
      method: 'GET',
      url: '/v1/projects',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().projects).toHaveLength(1);
    expect(response.json().projects[0]).toMatchObject({
      title: 'Run a marathon',
      pillarName: 'Health',
    });

    await app.close();
  });

  it('updates a project and sets completedAt when completed', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');
    const projectId = (await createProject(app, cookie, pillarId)).json().project.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/projects/${projectId}`,
      headers: { cookie },
      payload: { title: 'Renamed', status: 'COMPLETED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().project).toMatchObject({ title: 'Renamed', status: 'COMPLETED' });
    expect(response.json().project.completedAt).toBeTruthy();

    await app.close();
  });

  it('deletes a project', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');
    const projectId = (await createProject(app, cookie, pillarId)).json().project.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/projects/${projectId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });
});

describe('Project tasks', () => {
  it('adds a task to a project', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');
    const projectId = (await createProject(app, cookie, pillarId)).json().project.id;

    const response = await addTask(app, cookie, projectId);

    expect(response.statusCode).toBe(201);
    expect(response.json().task).toMatchObject({ title: 'Design mockups', isDone: false });

    await app.close();
  });

  it('toggles a task and reflects progress in the project', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');
    const projectId = (await createProject(app, cookie, pillarId)).json().project.id;
    const taskId = (await addTask(app, cookie, projectId, 'Write copy')).json().task.id;

    const toggle = await app.inject({
      method: 'PATCH',
      url: `/v1/projects/tasks/${taskId}`,
      headers: { cookie },
      payload: { isDone: true },
    });

    expect(toggle.statusCode).toBe(200);
    expect(toggle.json().task.isDone).toBe(true);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/projects/${projectId}`,
      headers: { cookie },
    });

    expect(detail.json().project.progress).toBe(100);
    expect(detail.json().project.tasks).toHaveLength(1);
    expect(detail.json().project.tasks[0].isDone).toBe(true);

    await app.close();
  });

  it('computes progress from completed tasks', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');
    const projectId = (await createProject(app, cookie, pillarId)).json().project.id;

    const t1 = (await addTask(app, cookie, projectId, 'Task A')).json().task.id;
    const t2 = (await addTask(app, cookie, projectId, 'Task B')).json().task.id;
    const t3 = (await addTask(app, cookie, projectId, 'Task C')).json().task.id;

    await app.inject({
      method: 'PATCH',
      url: `/v1/projects/tasks/${t1}`,
      headers: { cookie },
      payload: { isDone: true },
    });
    await app.inject({
      method: 'PATCH',
      url: `/v1/projects/tasks/${t2}`,
      headers: { cookie },
      payload: { isDone: true },
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/projects/${projectId}`,
      headers: { cookie },
    });

    expect(detail.json().project.progress).toBe(67);
    expect(detail.json().project.tasks.map((t: { id: string }) => t.id)).toEqual([t1, t2, t3]);

    await app.inject({
      method: 'DELETE',
      url: `/v1/projects/tasks/${t3}`,
      headers: { cookie },
    });

    const afterDelete = await app.inject({
      method: 'GET',
      url: `/v1/projects/${projectId}`,
      headers: { cookie },
    });
    expect(afterDelete.json().project.progress).toBe(100);

    await app.close();
  });

  it('reorders tasks by position', async () => {
    const app = await buildApp({ csrf: false });
    const cookie = await registerAndGetCookie(app, uniqueEmail());
    const pillarId = await createPillar(app, cookie, 'Engineering');
    const projectId = (await createProject(app, cookie, pillarId)).json().project.id;

    const t1 = (await addTask(app, cookie, projectId, 'A')).json().task.id;
    const t2 = (await addTask(app, cookie, projectId, 'B')).json().task.id;

    const reorder = await app.inject({
      method: 'POST',
      url: `/v1/projects/${projectId}/tasks/reorder`,
      headers: { cookie },
      payload: { ids: [t2, t1] },
    });

    expect(reorder.statusCode).toBe(200);
    expect(reorder.json()).toEqual({ count: 2 });

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/projects/${projectId}`,
      headers: { cookie },
    });
    expect(detail.json().project.tasks.map((t: { id: string }) => t.id)).toEqual([t2, t1]);

    await app.close();
  });

  it('rejects adding a task to another user\'s project', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Engineering');
    const projectId = (await createProject(app, cookieA, pillarA)).json().project.id;

    const response = await addTask(app, cookieB, projectId);

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});

describe('Project isolation', () => {
  it('prevents another user from reading or mutating a project', async () => {
    const app = await buildApp({ csrf: false });
    const cookieA = await registerAndGetCookie(app, uniqueEmail());
    const cookieB = await registerAndGetCookie(app, uniqueEmail());
    const pillarA = await createPillar(app, cookieA, 'Engineering');
    const projectId = (await createProject(app, cookieA, pillarA)).json().project.id;

    const get = await app.inject({ method: 'GET', url: `/v1/projects/${projectId}`, headers: { cookie: cookieB } });
    expect(get.statusCode).toBe(404);

    const patch = await app.inject({ method: 'PATCH', url: `/v1/projects/${projectId}`, headers: { cookie: cookieB }, payload: { title: 'Hacked' } });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({ method: 'DELETE', url: `/v1/projects/${projectId}`, headers: { cookie: cookieB } });
    expect(del.statusCode).toBe(404);

    const stillThere = await app.inject({ method: 'GET', url: `/v1/projects/${projectId}`, headers: { cookie: cookieA } });
    expect(stillThere.statusCode).toBe(200);

    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await buildApp({ csrf: false });

    const response = await app.inject({ method: 'GET', url: '/v1/projects' });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
