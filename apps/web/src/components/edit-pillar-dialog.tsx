import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#78716c", "#64748b",
];

interface Pillar {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function EditPillarDialog({
  pillar,
  onUpdated,
}: {
  pillar: Pillar;
  onUpdated: (pillar: Pillar) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  function syncFromPillar() {
    setName(pillar.name);
    setIcon(pillar.icon ?? "");
    setDescription(pillar.description ?? "");
    setColor(pillar.color ?? "");
    setNameTouched(false);
  }

  const nameError = nameTouched && !name.trim() ? "Name is required" : undefined;
  const canSubmit = name.trim().length > 0;

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: name.trim() };
      body.color = color || null;
      body.icon = icon.trim() || null;
      body.description = description.trim() || null;
      const res = await api.patch<{ pillar: Pillar }>(`/pillars/${pillar.id}`, body);
      onUpdated(res.data.pillar);
      toast.success("Pillar updated");
      setOpen(false);
    } catch {
      toast.error("Failed to update pillar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) syncFromPillar();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-md p-1.5 text-foreground/60 hover:text-foreground"
            aria-label={`Edit ${pillar.name}`}
          >
            <Pencil className="size-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-110.25">
        <DialogHeader>
          <DialogTitle>Edit pillar</DialogTitle>
          <DialogDescription>Rename the pillar or pick a new color.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="ep-name">Pillar name</Label>
            <input
              id="ep-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              onBlur={() => setNameTouched(true)}
              placeholder="e.g. Health"
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "ep-name-error" : undefined}
              className={`rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 ${
                nameError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                  : "border-input focus:ring-ring"
              }`}
            />
            {nameError && (
              <p id="ep-name-error" role="alert" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ep-icon">Icon (optional)</Label>
            <input
              id="ep-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🏥"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ep-desc">Description (optional)</Label>
            <textarea
              id="ep-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(active ? "" : c)}
                    className="relative flex size-8 items-center justify-center rounded-full transition-all"
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                    aria-pressed={active}
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
          <Button onClick={handleSave} disabled={saving || !canSubmit} className="w-full sm:w-auto">
            {saving ? <Spinner className="mr-2" /> : null}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
