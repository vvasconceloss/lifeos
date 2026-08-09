import { toast } from "sonner";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
import { inputClass } from "@/lib/input-class";
import type { Project } from "@/components/projects/types";
import type { ProjectStatus } from "@lifeos/shared";
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

const STATUSES: ProjectStatus[] = ["PLANNING", "IN_PROGRESS", "COMPLETED", "PAUSED"];

export function EditProjectDialog({
  project,
  pillars,
  onUpdated,
}: {
  project: Omit<Project, "taskCount">;
  pillars: Pillar[];
  onUpdated: (project: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [saving, setSaving] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  function syncFromProject() {
    setTitle(project.title);
    setDescription(project.description ?? "");
    setPillarId(project.pillarId);
    setDeadline(project.deadline ?? "");
    setStatus(project.status);
    setTitleTouched(false);
  }

  const titleError = titleTouched && !title.trim() ? "Title is required" : undefined;
  const canSubmit = title.trim().length > 0;

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        ...(pillarId ? { pillarId } : {}),
        deadline: deadline || null,
        status,
      };
      const res = await api.patch<{ project: Project }>(`/projects/${project.id}`, payload);
      onUpdated(res.data.project);
      toast.success("Project updated");
      setOpen(false);
    } catch {
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  const selectedPillar = pillars.find((p) => p.id === pillarId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) syncFromProject();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-md p-1.5 text-foreground/60 hover:text-foreground"
            aria-label={`Edit ${project.title}`}
          >
            <Pencil className="size-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update the work, its pillar, deadline or status.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="ep-title">Title</Label>
            <input
              id="ep-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              onBlur={() => setTitleTouched(true)}
              placeholder="e.g. Build the landing page"
              aria-invalid={titleError ? "true" : undefined}
              aria-describedby={titleError ? "ep-title-error" : undefined}
              className={`${inputClass} ${
                titleError ? "border-destructive focus:ring-destructive/30" : ""
              }`}
            />
            {titleError && (
              <p id="ep-title-error" role="alert" className="text-xs text-destructive">
                {titleError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ep-desc">Description (optional)</Label>
            <textarea
              id="ep-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ep-pillar">Pillar</Label>
            <Select value={pillarId} onValueChange={(v) => setPillarId(v ?? "")}>
              <SelectTrigger id="ep-pillar" className="w-full">
                <SelectValue>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Deadline (optional)</Label>
              <DatePicker
                value={deadline ? new Date(`${deadline}T00:00:00`) : null}
                onChange={(d) => setDeadline(d ? format(d, "yyyy-MM-dd") : "")}
                placeholder="Pick a deadline"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ep-status">Status</Label>
              <select
                id="ep-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
                  </option>
                ))}
              </select>
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
