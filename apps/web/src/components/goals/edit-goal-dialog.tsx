import { toast } from "sonner";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
import { inputClass } from "@/lib/input-class";
import type { Goal } from "@/components/goals/types";
import type { GoalStatus } from "@lifeos/shared";
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

const STATUSES: GoalStatus[] = ["ACTIVE", "COMPLETED", "ABANDONED"];

export function EditGoalDialog({
  goal,
  pillars,
  onUpdated,
}: {
  goal: Omit<Goal, "habitCount">;
  pillars: Pillar[];
  onUpdated: (goal: Goal) => void;
}) {
  const { t } = useTranslation("goals");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<GoalStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  function syncFromGoal() {
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setPillarId(goal.pillarId);
    setDeadline(goal.deadline ?? "");
    setStatus(goal.status);
    setTitleTouched(false);
  }

  const titleError = titleTouched && !title.trim() ? t("editGoal.titleRequired") : undefined;
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
      const res = await api.patch<{ goal: Goal }>(`/goals/${goal.id}`, payload);
      onUpdated(res.data.goal);
      toast.success(t("toast.updated"));
      setOpen(false);
    } catch {
      toast.error(t("toast.updateFailed"));
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
        if (o) syncFromGoal();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-md p-1.5 text-foreground/60 hover:text-foreground"
            aria-label={t("editGoal.editLabel", { name: goal.title })}
          >
            <Pencil className="size-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{t("editGoal.title")}</DialogTitle>
          <DialogDescription>{t("editGoal.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="eg-title">{t("editGoal.titleLabel")}</Label>
            <input
              id="eg-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              onBlur={() => setTitleTouched(true)}
              placeholder={t("editGoal.titlePlaceholder")}
              aria-invalid={titleError ? "true" : undefined}
              aria-describedby={titleError ? "eg-title-error" : undefined}
              className={`${inputClass} ${
                titleError ? "border-destructive focus:ring-destructive/30" : ""
              }`}
            />
            {titleError && (
              <p id="eg-title-error" role="alert" className="text-xs text-destructive">
                {titleError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eg-desc">{t("editGoal.descriptionLabel")}</Label>
            <textarea
              id="eg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eg-pillar">{t("editGoal.pillarLabel")}</Label>
            <Select value={pillarId} onValueChange={(v) => setPillarId(v ?? "")}>
              <SelectTrigger id="eg-pillar" className="w-full">
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
              <Label>{t("editGoal.deadlineLabel")}</Label>
              <DatePicker
                value={deadline ? new Date(`${deadline}T00:00:00`) : null}
                onChange={(d) => setDeadline(d ? format(d, "yyyy-MM-dd") : "")}
                placeholder={t("editGoal.deadlinePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eg-status">{t("editGoal.statusLabel")}</Label>
              <select
                id="eg-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !canSubmit} className="w-full sm:w-auto">
            {saving ? <Spinner className="mr-2" /> : null}
            {saving ? t("editGoal.saving") : t("common:saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
