import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
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
  createdAt: string;
  updatedAt: string;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#78716c", "#64748b",
];

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PillarCard({
  pillar,
  editingId,
  editName,
  editColor,
  savingId,
  deletingId,
  onEditName,
  onEditColor,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  pillar: Pillar;
  editingId: string | null;
  editName: string;
  editColor: string;
  savingId: string | null;
  deletingId: string | null;
  onEditName: (v: string) => void;
  onEditColor: (v: string) => void;
  onStartEdit: (p: Pillar) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [alertOpen, setAlertOpen] = useState(false);

  if (editingId === pillar.id) {
    return (
      <li className="rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            className="block rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(pillar.id);
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => {
              const active = editColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onEditColor(active ? "" : c)}
                  className="relative flex size-7 items-center justify-center rounded-full transition-all"
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                >
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full ring-2 ring-foreground ring-offset-1 ring-offset-background">
                      <Check className="size-3.5 text-white drop-shadow-md" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 self-end">
            <button
              onClick={() => onSaveEdit(pillar.id)}
              disabled={savingId === pillar.id || !editName.trim()}
              className="rounded-md p-1.5 text-foreground/65 hover:text-foreground disabled:opacity-50"
            >
              {savingId === pillar.id ? <Spinner /> : <Check className="size-4" />}
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
      <div className="flex items-center justify-between">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground">
          {pillar.color && (
            <span
              className="inline-block size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: pillar.color }}
            />
          )}
          {pillar.name}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onStartEdit(pillar)}
            className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
            aria-label={`Edit ${pillar.name}`}
          >
            <Pencil className="size-4" />
          </button>

          <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogTrigger
              render={<button />}
              disabled={deletingId === pillar.id}
              className="rounded-md p-1.5 text-foreground/50 hover:text-destructive disabled:opacity-50"
              aria-label={`Delete ${pillar.name}`}
            >
              {deletingId === pillar.id ? <Spinner /> : <Trash2 className="size-4" />}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete pillar?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>{pillar.name}</strong>. Pillars that still contain habits cannot be deleted — archive or delete the habits first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setAlertOpen(false);
                    onDelete(pillar.id);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </li>
  );
}
