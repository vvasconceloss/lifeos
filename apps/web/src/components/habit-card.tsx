import { useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Spinner } from "@/components/ui/spinner";
import { EditHabitDialog } from "@/components/edit-habit-dialog";
import { FrequencyBadge } from "@/components/frequency-badge";
import type { HabitFrequency } from "@lifeos/shared";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
}

interface Habit {
  id: string;
  name: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  isActive: boolean;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
  archivedAt: string | null;
}

export function HabitCard({
  habit,
  pillars,
  deletingId,
  archivingId,
  onArchive,
  onDelete,
  onUpdated,
}: {
  habit: Habit;
  pillars: Pillar[];
  deletingId: string | null;
  archivingId: string | null;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdated: (habit: Habit) => void;
}) {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <li className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent/30">
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={`text-sm ${
            habit.isActive ? "text-foreground" : "text-foreground/60 line-through"
          }`}
        >
          <Link to="/habits/$id" params={{ id: habit.id }} className="hover:underline">
            {habit.name}
          </Link>
        </span>
        {habit.description && (
          <span className="truncate text-xs text-foreground/60">{habit.description}</span>
        )}
        <span className="mt-1.5">
          <FrequencyBadge
            frequency={habit.frequency}
            daysOfWeek={habit.daysOfWeek}
            timesPerWeek={habit.timesPerWeek}
            timesPerMonth={habit.timesPerMonth}
          />
        </span>
      </div>
      {habit.isActive && (
        <EditHabitDialog habit={habit} pillars={pillars} onUpdated={onUpdated} />
      )}
      {habit.isActive && (
        <Tooltip>
          <TooltipTrigger
            render={<button />}
            onClick={() => onArchive(habit.id)}
            disabled={archivingId === habit.id}
            className="rounded-md p-1.5 text-foreground/60 hover:text-foreground disabled:opacity-50"
            aria-label={`Archive ${habit.name}`}
          >
            {archivingId === habit.id ? <Spinner /> : <Archive className="size-4" />}
          </TooltipTrigger>
          <TooltipContent>Archive</TooltipContent>
        </Tooltip>
      )}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogTrigger
          render={<button />}
          disabled={deletingId === habit.id}
          className="rounded-md p-1.5 text-foreground/60 hover:text-destructive disabled:opacity-50"
          aria-label={`Delete ${habit.name}`}
        >
          {deletingId === habit.id ? <Spinner /> : <Trash2 className="size-4" />}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete habit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{habit.name}</strong> and all its completion history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setAlertOpen(false);
                onDelete(habit.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
