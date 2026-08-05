import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState } from "react";
import { AxiosError } from "axios";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

export function NewPillarModal({
  onCreated,
}: {
  onCreated: (pillar: Pillar) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [creating, setCreating] = useState(false);

  function reset() {
    setName("");
    setSelectedColor("");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<{ pillar: Pillar }>("/pillars", {
        name: name.trim(),
        ...(selectedColor ? { color: selectedColor } : {}),
      });
      onCreated(res.data.pillar);
      reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error("Name must be between 1 and 100 characters");
      } else {
        toast.error("Failed to create pillar");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-1.5 size-4" />
        New Pillar
      </DialogTrigger>
      <DialogContent className="sm:max-w-110.25">
        <DialogHeader>
          <DialogTitle>Create new pillar</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="np-name">Pillar name</Label>
            <input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Health"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label>Colors (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => {
                const active = selectedColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(active ? "" : c)}
                    className="relative flex size-8 items-center justify-center rounded-full transition-all"
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  >
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-background">
                        <Check className="size-4 text-white drop-shadow-md" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full sm:w-auto"
          >
            {creating ? <Spinner className="mr-2" /> : null}
            {creating ? "Saving..." : "Save Pillar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
