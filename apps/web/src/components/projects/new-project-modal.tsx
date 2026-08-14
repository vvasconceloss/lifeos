import { toast } from "sonner";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
import { inputClass } from "@/lib/input-class";
import type { Project } from "@/components/projects/types";
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

export function NewProjectModal({
  pillars,
  onCreated,
}: {
  pillars: Pillar[];
  onCreated: (project: Project) => void;
}) {
  const { t } = useTranslation("projects");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  const titleError = titleTouched && !title.trim() ? t("newProject.titleRequired") : undefined;
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

      const res = await api.post<{ project: Project }>("/projects", payload);
      onCreated(res.data.project);
      reset();
      setOpen(false);
    } catch {
      toast.error(t("toast.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  const selectedPillar = pillars.find((p) => p.id === pillarId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-1.5 size-4" />
        {t("newProject.trigger")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{t("newProject.title")}</DialogTitle>
          <DialogDescription>
            {t("newProject.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="np-title">{t("newProject.titleLabel")}</Label>
            <input
              id="np-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              onBlur={() => setTitleTouched(true)}
              placeholder={t("newProject.titlePlaceholder")}
              aria-invalid={titleError ? "true" : undefined}
              aria-describedby={titleError ? "np-title-error" : undefined}
              className={`${inputClass} ${
                titleError ? "border-destructive focus:ring-destructive/30" : ""
              }`}
            />
            {titleError && (
              <p id="np-title-error" role="alert" className="text-xs text-destructive">
                {titleError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="np-desc">{t("newProject.descriptionLabel")}</Label>
            <textarea
              id="np-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("newProject.descriptionPlaceholder")}
              rows={3}
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="np-pillar">{t("newProject.pillarLabel")}</Label>
            <Select value={pillarId} onValueChange={(v) => setPillarId(v ?? "")}>
              <SelectTrigger id="np-pillar" className="w-full">
                <SelectValue placeholder={t("newProject.pillarPlaceholder")}>
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
            <Label>{t("newProject.deadlineLabel")}</Label>
            <DatePicker
              value={deadline ? new Date(`${deadline}T00:00:00`) : null}
              onChange={(d) => setDeadline(d ? format(d, "yyyy-MM-dd") : "")}
              placeholder={t("newProject.deadlinePlaceholder")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={creating || !canSubmit} className="w-full sm:w-auto">
            {creating ? <Spinner className="mr-2" /> : null}
            {creating ? t("newProject.saving") : t("newProject.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
