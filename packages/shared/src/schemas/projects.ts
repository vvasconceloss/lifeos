import { z } from "zod";
import { dateKeySchema } from "./common";

export const PROJECT_STATUSES = [
  "PLANNING",
  "IN_PROGRESS",
  "COMPLETED",
  "PAUSED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const createProjectBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pillarId: z.uuid(),
  deadline: dateKeySchema.optional(),
});

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;

export const updateProjectBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  pillarId: z.uuid().optional(),
  deadline: dateKeySchema.optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;

export const createProjectTaskBodySchema = z.object({
  title: z.string().min(1).max(500),
});

export type CreateProjectTaskBody = z.infer<typeof createProjectTaskBodySchema>;

export const updateProjectTaskBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  isDone: z.boolean().optional(),
});

export type UpdateProjectTaskBody = z.infer<typeof updateProjectTaskBodySchema>;

export const projectTaskReorderBodySchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

export type ProjectTaskReorderBody = z.infer<typeof projectTaskReorderBodySchema>;

export interface ProjectResponse {
  id: string;
  title: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  pillarColor: string | null;
  status: ProjectStatus;
  deadline: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  progress: number;
  taskCount: number;
}

export interface ProjectTaskResponse {
  id: string;
  projectId: string;
  title: string;
  isDone: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDetailResponse extends Omit<ProjectResponse, "taskCount"> {
  tasks: ProjectTaskResponse[];
}
