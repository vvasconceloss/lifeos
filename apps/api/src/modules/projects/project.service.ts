import { prisma } from "../../db/client";
import type {
  CreateProjectBody,
  CreateProjectTaskBody,
  ProjectDetailResponse,
  ProjectResponse,
  ProjectTaskResponse,
  UpdateProjectBody,
  UpdateProjectTaskBody,
} from "./project.schemas";

const PROJECT_NOT_FOUND = "Project not found";
const PILLAR_NOT_FOUND = "Pillar not found";
const TASK_NOT_FOUND = "Task not found";

type ProjectWithPillar = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pillarId: string;
  pillar: { name: string; color: string | null };
};

function progressOf(total: number, done: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function toResponse(
  project: ProjectWithPillar,
  taskCount: number,
  doneCount: number,
): ProjectResponse {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    pillarId: project.pillarId,
    pillarName: project.pillar.name,
    pillarColor: project.pillar.color,
    status: project.status as ProjectResponse["status"],
    deadline: project.deadline ? deadlineKey(project.deadline) : null,
    completedAt: project.completedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    progress: progressOf(taskCount, doneCount),
    taskCount,
  };
}

function deadlineKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function deadlineDate(deadline?: string | null): Date | null | undefined {
  if (deadline === undefined) return undefined;
  if (deadline === null) return null;
  return new Date(`${deadline}T00:00:00.000Z`);
}

function toTaskResponse(task: {
  id: string;
  projectId: string;
  title: string;
  isDone: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): ProjectTaskResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    isDone: task.isDone,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function createProject(
  userId: string,
  data: CreateProjectBody,
): Promise<{ project: ProjectResponse } | { error: string; status: number }> {
  const pillar = await prisma.pillar.findFirst({
    where: { id: data.pillarId, userId },
  });
  if (!pillar) return { error: PILLAR_NOT_FOUND, status: 404 };

  const project = await prisma.project.create({
    data: {
      userId,
      pillarId: data.pillarId,
      title: data.title,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.deadline !== undefined && { deadline: deadlineDate(data.deadline) as Date }),
    },
    include: { pillar: { select: { name: true, color: true } } },
  });

  return { project: toResponse(project, 0, 0) };
}

export async function listProjects(userId: string): Promise<ProjectResponse[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    include: { pillar: { select: { name: true, color: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (projects.length === 0) return [];

  const ids = projects.map((p) => p.id);
  const [totalRows, doneRows] = await Promise.all([
    prisma.projectTask.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.projectTask.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids }, isDone: true },
      _count: { _all: true },
    }),
  ]);
  const total = new Map(totalRows.map((r) => [r.projectId, r._count._all]));
  const done = new Map(doneRows.map((r) => [r.projectId, r._count._all]));

  return projects.map((p) =>
    toResponse(p, total.get(p.id) ?? 0, done.get(p.id) ?? 0),
  );
}

export async function getProject(
  projectId: string,
  userId: string,
): Promise<ProjectDetailResponse | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      pillar: { select: { name: true, color: true } },
      tasks: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!project) return null;

  const taskCount = project.tasks.length;
  const doneCount = project.tasks.filter((t) => t.isDone).length;

  const base = toResponse(project, taskCount, doneCount);

  return {
    id: base.id,
    title: base.title,
    description: base.description,
    pillarId: base.pillarId,
    pillarName: base.pillarName,
    pillarColor: base.pillarColor,
    status: base.status,
    deadline: base.deadline,
    completedAt: base.completedAt,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    progress: base.progress,
    tasks: project.tasks.map(toTaskResponse),
  };
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectBody,
): Promise<{ project: ProjectResponse } | { error: string; status: number }> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { pillar: { select: { name: true, color: true } } },
  });
  if (!existing) return { error: PROJECT_NOT_FOUND, status: 404 };

  if (data.pillarId) {
    const pillar = await prisma.pillar.findFirst({
      where: { id: data.pillarId, userId },
    });
    if (!pillar) return { error: PILLAR_NOT_FOUND, status: 404 };
  }

  const status = data.status;
  const deadline = deadlineDate(data.deadline);

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.pillarId !== undefined && { pillarId: data.pillarId }),
      ...(deadline !== undefined && { deadline }),
      ...(status !== undefined && {
        status: status as never,
        completedAt: status === "COMPLETED" ? new Date() : null,
      }),
    },
    include: { pillar: { select: { name: true, color: true } } },
  });

  const [taskCount, doneCount] = await Promise.all([
    prisma.projectTask.count({ where: { projectId } }),
    prisma.projectTask.count({ where: { projectId, isDone: true } }),
  ]);

  return { project: toResponse(updated, taskCount, doneCount) };
}

export async function deleteProject(
  projectId: string,
  userId: string,
): Promise<true | { error: string; status: number }> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!existing) return { error: PROJECT_NOT_FOUND, status: 404 };

  await prisma.project.delete({ where: { id: projectId } });
  return true;
}

export async function addProjectTask(
  projectId: string,
  userId: string,
  data: CreateProjectTaskBody,
): Promise<{ task: ProjectTaskResponse } | { error: string; status: number }> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) return { error: PROJECT_NOT_FOUND, status: 404 };

  const maxPosition = await prisma.projectTask.aggregate({
    where: { projectId },
    _max: { position: true },
  });

  const task = await prisma.projectTask.create({
    data: {
      projectId,
      title: data.title,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return { task: toTaskResponse(task) };
}

export async function updateProjectTask(
  taskId: string,
  userId: string,
  data: UpdateProjectTaskBody,
): Promise<{ task: ProjectTaskResponse } | { error: string; status: number }> {
  const existing = await prisma.projectTask.findFirst({
    where: { id: taskId, project: { userId } },
  });
  if (!existing) return { error: TASK_NOT_FOUND, status: 404 };

  const task = await prisma.projectTask.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.isDone !== undefined && { isDone: data.isDone }),
    },
  });

  return { task: toTaskResponse(task) };
}

export async function deleteProjectTask(
  taskId: string,
  userId: string,
): Promise<true | { error: string; status: number }> {
  const existing = await prisma.projectTask.findFirst({
    where: { id: taskId, project: { userId } },
  });
  if (!existing) return { error: TASK_NOT_FOUND, status: 404 };

  await prisma.projectTask.delete({ where: { id: taskId } });
  return true;
}

export async function reorderProjectTasks(
  projectId: string,
  userId: string,
  ids: string[],
): Promise<{ count: number } | { error: string; status: number }> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) return { error: PROJECT_NOT_FOUND, status: 404 };

  const owned = await prisma.projectTask.findMany({
    where: { id: { in: ids }, projectId },
    select: { id: true },
  });
  if (owned.length !== ids.length) {
    return { error: TASK_NOT_FOUND, status: 404 };
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.projectTask.update({ where: { id }, data: { position: index } }),
    ),
  );

  return { count: ids.length };
}
