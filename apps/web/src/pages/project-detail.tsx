import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Pencil, Trash2, X } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { NewTaskModal } from "@/components/projects/new-task-modal";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import type { Project, ProjectDetail, ProjectTask } from "@/components/projects/types";
import type { ProjectStatus } from "@lifeos/shared";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
}

const STATUSES: ProjectStatus[] = ["PLANNING", "IN_PROGRESS", "COMPLETED", "PAUSED"];

function TaskRow({
  task,
  index,
  count,
  onToggle,
  onSave,
  onDelete,
  onMove,
}: {
  task: ProjectTask;
  index: number;
  count: number;
  onToggle: (task: ProjectTask) => void;
  onSave: (task: ProjectTask, title: string) => void;
  onDelete: (task: ProjectTask) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  return (
    <li className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 shadow-sm transition-colors hover:bg-accent/30">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.isDone ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        aria-pressed={task.isDone}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          task.isDone ? "border-primary bg-primary text-primary-foreground" : "border-foreground/25"
        }`}
      >
        {task.isDone && <Check className="size-3" />}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSave(task, title.trim());
                setEditing(false);
              } else if (e.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={`Edit task ${task.title}`}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitle(task.title);
              setEditing(true);
            }}
            className={`block w-full truncate text-left text-sm hover:underline ${
              task.isDone ? "text-foreground/50 line-through" : "text-foreground"
            }`}
          >
            {task.title}
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="rounded p-0.5 text-foreground/40 hover:text-foreground disabled:opacity-30"
          aria-label={`Move "${task.title}" up`}
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === count - 1}
          className="rounded p-0.5 text-foreground/40 hover:text-foreground disabled:opacity-30"
          aria-label={`Move "${task.title}" down`}
        >
          <ArrowDown className="size-3.5" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                onSave(task, title.trim());
                setEditing(false);
              }}
              className="rounded-md p-1.5 text-foreground/60 hover:text-primary"
              aria-label="Save task title"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(task.title);
                setEditing(false);
              }}
              className="rounded-md p-1.5 text-foreground/60 hover:text-foreground"
              aria-label="Cancel editing"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitle(task.title);
              setEditing(true);
            }}
            className="rounded-md p-1.5 text-foreground/40 hover:text-foreground"
            aria-label={`Edit "${task.title}"`}
          >
            <Pencil className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="rounded-md p-1.5 text-foreground/40 hover:text-destructive"
          aria-label={`Delete "${task.title}"`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams({ from: "/projects/$id" });
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [projectRes, pillarsRes] = await Promise.all([
          api.get<{ project: ProjectDetail }>(`/projects/${id}`),
          api.get<{ pillars: Pillar[] }>("/pillars"),
        ]);
        if (cancelled) return;
        setProject(projectRes.data.project);
        setPillars(pillarsRes.data.pillars);
      } catch (e) {
        if (!cancelled && !isUnauthorizedError(e)) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  function retry() {
    setError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  function handleUpdated(updated: Project) {
    setProject((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  }

  async function handleStatus(status: ProjectStatus) {
    if (!project) return;
    try {
      const res = await api.patch<{ project: Project }>(`/projects/${project.id}`, { status });
      setProject((prev) => (prev && prev.id === res.data.project.id ? { ...prev, ...res.data.project } : prev));
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleToggleTask(task: ProjectTask) {
    try {
      await api.patch(`/projects/tasks/${task.id}`, { isDone: !task.isDone });
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function handleSaveTaskTitle(task: ProjectTask, title: string) {
    if (!title) return;
    try {
      await api.patch(`/projects/tasks/${task.id}`, { title });
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function handleDeleteTask(task: ProjectTask) {
    try {
      await api.delete(`/projects/tasks/${task.id}`);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Failed to delete task");
    }
  }

  async function handleMoveTask(index: number, direction: -1 | 1) {
    if (!project) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= project.tasks.length) return;

    const next = [...project.tasks];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

    setProject((prev) => (prev ? { ...prev, tasks: next } : prev));
    try {
      await api.post(`/projects/${project.id}/tasks/reorder`, {
        ids: next.map((t) => t.id),
      });
    } catch {
      toast.error("Failed to reorder tasks");
      setReloadKey((k) => k + 1);
    }
  }

  const tasks = project?.tasks ?? [];
  const doneCount = tasks.filter((t) => t.isDone).length;

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6 lg:overflow-hidden">
          {loading && !project ? (
            <div className="flex flex-1 items-center justify-center text-foreground/60">
              <Spinner />
            </div>
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : project ? (
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Link
                  to="/projects"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 text-foreground/60 hover:text-foreground"
                  aria-label="Back to projects"
                >
                  <ArrowLeft className="size-4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{project.title}</h2>
                  <span className="text-xs text-foreground/60">{project.pillarName}</span>
                </div>
                <ProjectStatusBadge status={project.status} />
                <EditProjectDialog project={project} pillars={pillars} onUpdated={handleUpdated} />
              </div>

              <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
                <div className="flex shrink-0 flex-col gap-6">
                  <div className="shrink-0 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-medium text-foreground/60">Progress</span>
                      <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-border/60">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${project.progress}%`, backgroundColor: project.pillarColor ?? "var(--chart-1)" }}
                      />
                    </div>
                    <div className="mt-3 text-xs text-foreground/60">
                      {doneCount} of {tasks.length} tasks done
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-4">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatus(s)}
                          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                            project.status === s
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent text-foreground/70 hover:bg-accent/70"
                          }`}
                        >
                          {s.toLowerCase().replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {project.description && (
                    <div className="shrink-0 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                      <span className="text-xs font-medium text-foreground/60">Description</span>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/70">
                        {project.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <span className="text-xs font-medium text-foreground/60">Tasks</span>
                    {project && <NewTaskModal projectId={project.id} onCreated={() => setReloadKey((k) => k + 1)} />}
                  </div>

                  {tasks.length === 0 ? (
                    <p className="py-4 text-center text-xs text-foreground/60">
                      No tasks yet. Add a task to get started.
                    </p>
                  ) : (
                    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto scroll-subtle lg:overflow-x-hidden">
                      {tasks.map((task, index) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          index={index}
                          count={tasks.length}
                          onToggle={handleToggleTask}
                          onSave={handleSaveTaskTitle}
                          onDelete={handleDeleteTask}
                          onMove={handleMoveTask}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
