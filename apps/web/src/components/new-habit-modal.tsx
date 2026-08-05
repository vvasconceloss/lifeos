import { toast } from "sonner";
import { api } from "@/lib/api";
import { AxiosError } from "axios";
import { useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function NewHabitModal({
  pillars,
  onCreated,
}: {
  pillars: Pillar[];
  onCreated: (habit: Habit) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [creating, setCreating] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [pillarTouched, setPillarTouched] = useState(false);

  const nameError = nameTouched && !name.trim() ? "Name is required" : undefined;
  const pillarError = pillarTouched && !pillarId ? "Select a pillar" : undefined;

  function reset() {
    setName("");
    setDescription("");
    setPillarId("");
    setNameTouched(false);
    setPillarTouched(false);
  }

  async function handleCreate() {
    if (!name.trim() || !pillarId) return;

    setCreating(true);
    try {
      const res = await api.post<{ habit: Habit }>("/habits", {
        name: name.trim(),
        description: description.trim() || undefined,
        pillarId,
      });
      onCreated(res.data.habit);
      reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error("Name must be between 1 and 200 characters");
      } else {
        toast.error("Failed to create habit");
      }
    } finally {
      setCreating(false);
    }
  }

  const selectedPillar = pillars.find((p) => p.id === pillarId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-1.5 size-4" />
        New Habit
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create new habit</DialogTitle>
          <DialogDescription>
            Add a habit to your routine and associate it with a pillar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nh-name">Habit name</Label>
            <input
              id="nh-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              onBlur={() => setNameTouched(true)}
              placeholder="e.g. Morning run"
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "nh-name-error" : undefined}
              className={`rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 ${
                nameError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                  : "border-input focus:ring-ring"
              }`}
            />
            {nameError && (
              <p id="nh-name-error" role="alert" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nh-desc">Description (optional)</Label>
            <input
              id="nh-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Run 5km"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nh-pillar">Pillar</Label>
            <Select
              value={pillarId}
              onValueChange={(v) => {
                setPillarId(v ?? "");
                setPillarTouched(true);
              }}
              onOpenChange={() => setPillarTouched(true)}
            >
              <SelectTrigger
                id="nh-pillar"
                className={`w-full ${pillarError ? "border-destructive" : ""}`}
                aria-invalid={pillarError ? "true" : undefined}
                aria-describedby={pillarError ? "nh-pillar-error" : undefined}
              >
                <SelectValue placeholder="Select a pillar">
                  {selectedPillar ? (
                    <span className="inline-flex items-center gap-2">
                      {selectedPillar.color && (
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: selectedPillar.color }}
                        />
                      )}
                      {selectedPillar.name}
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pillars.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      {p.color && (
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                      )}
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pillarError && (
              <p id="nh-pillar-error" role="alert" className="text-xs text-destructive">
                {pillarError}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !pillarId}
            className="w-full sm:w-auto"
          >
            {creating ? <Spinner className="mr-2" /> : null}
            {creating ? "Saving..." : "Save Habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
