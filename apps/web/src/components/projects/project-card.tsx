import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import type { Project } from "@/components/projects/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
}

export function ProjectCard({
  project,
  pillars,
  deletingId,
  onDelete,
  onUpdated,
}: {
  project: Project;
  pillars: Pillar[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  onUpdated: (project: Project) => void;
}) {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent/30">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: project.pillarColor ?? "#6b7280" }}
        />
        <Link
          to="/projects/$id"
          params={{ id: project.id }}
          className={`min-w-0 flex-1 truncate text-sm font-medium hover:underline ${
            project.status === "COMPLETED" ? "text-foreground/60 line-through" : "text-foreground"
          }`}
        >
          {project.title}
        </Link>
        <ProjectStatusBadge status={project.status} />
        <div className="flex shrink-0 items-center gap-1">
          <EditProjectDialog project={project} pillars={pillars} onUpdated={onUpdated} />
          <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogTrigger
              render={<button />}
              disabled={deletingId === project.id}
              className="rounded-md p-1.5 text-foreground/60 hover:text-destructive disabled:opacity-50"
              aria-label={`Delete ${project.title}`}
            >
              {deletingId === project.id ? <Spinner /> : <Trash2 className="size-4" />}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>{project.title}</strong> and all of its tasks.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setAlertOpen(false);
                    onDelete(project.id);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-4">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${project.progress}%`, backgroundColor: project.pillarColor ?? "var(--chart-1)" }}
          />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
          {project.progress}%
        </span>
      </div>

      <div className="flex items-center gap-3 pl-4 text-[10px] text-foreground/60">
        <span>
          {project.taskCount} task{project.taskCount === 1 ? "" : "s"}
        </span>
        {project.deadline && <span>· deadline {project.deadline}</span>}
      </div>
    </li>
  );
}
