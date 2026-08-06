import { toast } from "sonner";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
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
import { inputClass } from "@/lib/input-class";
import type { Goal } from "@/components/goals/types";
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

export function NewGoalModal({
  pillars,
  onCreated,
}: {
  pillars: Pillar[];
  onCreated: (goal: Goal) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  const titleError = titleTouched && !title.trim() ? "Title is required" : undefined;
  const canSubmit = title.trim().length > 0 && !!pillarId;

  function reset() {
    setTitle("");
    setDescription("");
    setPillarId("");
    setDeadline("");
    setTitleTouched(false);
  }

  async function handleCreate() {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const payload: Record<string, unknown> = { title: title.trim(), pillarId };
      if (description.trim()) payload.description = description.trim();
      if (deadline) payload.deadline = deadline;

      const res = await api.post<{ goal: Goal }>("/goals", payload);
      onCreated(res.data.goal);
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to create goal");
    } finally {
      setCreating(false);
    }
  }

  const selectedPillar = pillars.find((p) => p.id === pillarId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-1.5 size-4" />
        New Goal
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create new goal</DialogTitle>
          <DialogDescription>
            Define an outcome you want to achieve, then link the habits that support it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="ng-title">Title</Label>
            <input
              id="ng-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              onBlur={() => setTitleTouched(true)}
              placeholder="e.g. Become a better engineer"
              aria-invalid={titleError ? "true" : undefined}
              aria-describedby={titleError ? "ng-title-error" : undefined}
              className={`${inputClass} ${
                titleError ? "border-destructive focus:ring-destructive/30" : ""
              }`}
            />
            {titleError && (
              <p id="ng-title-error" role="alert" className="text-xs text-destructive">
                {titleError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ng-desc">Description (optional)</Label>
            <textarea
              id="ng-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does success look like?"
              rows={3}
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ng-pillar">Pillar</Label>
            <Select value={pillarId} onValueChange={(v) => setPillarId(v ?? "")}>
              <SelectTrigger id="ng-pillar" className="w-full">
                <SelectValue placeholder="Select a pillar">
                  {selectedPillar ? (
                    <span className="inline-flex items-center gap-2">
                      {selectedPillar.color && (
                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: selectedPillar.color }} />
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
                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: p.color }} />
                      )}
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Deadline (optional)</Label>
            <DatePicker
              value={deadline ? new Date(`${deadline}T00:00:00`) : null}
              onChange={(d) => setDeadline(d ? format(d, "yyyy-MM-dd") : "")}
              placeholder="Pick a deadline"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={creating || !canSubmit} className="w-full sm:w-auto">
            {creating ? <Spinner className="mr-2" /> : null}
            {creating ? "Saving..." : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
