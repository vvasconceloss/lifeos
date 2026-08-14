import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GoalStatusBadge } from "@/components/goals/goal-status-badge";
import { EditGoalDialog } from "@/components/goals/edit-goal-dialog";
import type { Goal } from "@/components/goals/types";
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

export function GoalCard({
  goal,
  pillars,
  deletingId,
  onDelete,
  onUpdated,
}: {
  goal: Goal;
  pillars: Pillar[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  onUpdated: (goal: Goal) => void;
}) {
  const { t } = useTranslation("goals");
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent/30">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: goal.pillarColor ?? "#6b7280" }}
        />
        <Link
          to="/goals/$id"
          params={{ id: goal.id }}
          className={`min-w-0 flex-1 truncate text-sm font-medium hover:underline ${
            goal.status === "COMPLETED" ? "text-foreground/60 line-through" : "text-foreground"
          }`}
        >
          {goal.title}
        </Link>
        <GoalStatusBadge status={goal.status} />
        <div className="flex shrink-0 items-center gap-1">
          <EditGoalDialog goal={goal} pillars={pillars} onUpdated={onUpdated} />
          <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogTrigger
              render={<button />}
              disabled={deletingId === goal.id}
              className="rounded-md p-1.5 text-foreground/60 hover:text-destructive disabled:opacity-50"
              aria-label={t("goalCard.deleteLabel", { name: goal.title })}
            >
              {deletingId === goal.id ? <Spinner /> : <Trash2 className="size-4" />}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("goalCard.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans i18nKey="goalCard.deleteDescription" values={{ name: goal.title }} />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setAlertOpen(false);
                    onDelete(goal.id);
                  }}
                >
                  {t("common:delete")}
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
            style={{ width: `${goal.progress}%`, backgroundColor: goal.pillarColor ?? "var(--chart-1)" }}
          />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
          {goal.progress}%
        </span>
      </div>

      <div className="flex items-center gap-3 pl-4 text-[10px] text-foreground/60">
        {goal.habitCount === 0 ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center text-amber-600 hover:text-amber-500 dark:text-amber-400"
                  aria-label={t("goalCard.noHabitsAria")}
                >
                  <AlertTriangle className="size-3.5" aria-hidden />
                </button>
              }
            />
            <TooltipContent>
              {t("goalCard.noHabits")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span>
            {t("goalCard.habitCount", { count: goal.habitCount })}
          </span>
        )}
        {goal.deadline && <span>{t("goalCard.deadline", { date: goal.deadline })}</span>}
      </div>
    </li>
  );
}
