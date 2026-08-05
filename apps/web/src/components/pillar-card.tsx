import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { EditPillarDialog } from "@/components/edit-pillar-dialog";
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

export function PillarCard({
  pillar,
  deletingId,
  onDelete,
  onUpdated,
}: {
  pillar: Pillar;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onUpdated: (pillar: Pillar) => void;
}) {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <li className="flex items-center justify-between rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm transition-colors hover:bg-accent/30">
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
        <EditPillarDialog pillar={pillar} onUpdated={onUpdated} />

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
    </li>
  );
}
