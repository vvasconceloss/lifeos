import { useState } from "react";
import { Archive, Check, Pencil, Trash2, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
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
  archivedAt: string | null;
}

export function HabitCard({
  habit,
  editingId,
  editName,
  editDescription,
  editPillarId,
  pillars,
  savingId,
  deletingId,
  archivingId,
  onEditName,
  onEditDescription,
  onEditPillarId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onArchive,
  onDelete,
}: {
  habit: Habit;
  editingId: string | null;
  editName: string;
  editDescription: string;
  editPillarId: string;
  pillars: Pillar[];
  savingId: string | null;
  deletingId: string | null;
  archivingId: string | null;
  onEditName: (v: string) => void;
  onEditDescription: (v: string) => void;
  onEditPillarId: (v: string) => void;
  onStartEdit: (h: Habit) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [alertOpen, setAlertOpen] = useState(false);

  if (editingId === habit.id) {
    return (
      <li className="rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            className="block rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(habit.id);
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <input
            type="text"
            value={editDescription}
            onChange={(e) => onEditDescription(e.target.value)}
            placeholder="Description"
            className="block rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={editPillarId}
            onChange={(e) => onEditPillarId(e.target.value)}
            className="block rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 self-end">
            <button
              onClick={() => onSaveEdit(habit.id)}
              disabled={savingId === habit.id || !editName.trim()}
              className="rounded-md p-1.5 text-foreground/65 hover:text-foreground disabled:opacity-50"
            >
              {savingId === habit.id ? <Spinner /> : <Check className="size-4" />}
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded-md p-1.5 text-foreground/65 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent/30">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className={`text-sm ${
              habit.isActive ? "text-foreground" : "text-foreground/50 line-through"
            }`}
          >
            {habit.name}
          </span>
          {habit.description && (
            <span className="truncate text-xs text-foreground/50">
              {habit.description}
            </span>
          )}
        </div>
        {habit.isActive && (
          <>
            <Tooltip>
              <TooltipTrigger
                render={<button />}
                onClick={() => onStartEdit(habit)}
                className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
              >
                <Pencil className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<button />}
                onClick={() => onArchive(habit.id)}
                disabled={archivingId === habit.id}
                className="rounded-md p-1.5 text-foreground/50 hover:text-foreground disabled:opacity-50"
              >
                {archivingId === habit.id ? <Spinner /> : <Archive className="size-4" />}
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
          </>
        )}
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogTrigger
            render={<button />}
            disabled={deletingId === habit.id}
            className="rounded-md p-1.5 text-foreground/50 hover:text-destructive disabled:opacity-50"
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
      </div>
    </li>
  );
}
