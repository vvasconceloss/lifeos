import type { GoalStatus } from "@lifeos/shared";

const STYLES: Record<GoalStatus, string> = {
  ACTIVE: "bg-primary/10 text-primary",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  ABANDONED: "bg-muted text-foreground/60",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STYLES[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
