import type { ProjectStatus } from "@lifeos/shared";

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  isDone: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  pillarColor: string | null;
  status: ProjectStatus;
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
  taskCount: number;
}

export interface ProjectDetail extends Omit<Project, "taskCount"> {
  tasks: ProjectTask[];
}
