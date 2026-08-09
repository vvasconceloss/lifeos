import type { ProjectStatus } from "@lifeos/shared";

const STYLES: Record<ProjectStatus, string> = {
  PLANNING: "bg-primary/10 text-primary",
  IN_PROGRESS: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  PAUSED: "bg-muted text-foreground/60",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STYLES[status]}`}
    >
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}
