import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { inputClass } from "@/lib/input-class";
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

export function NewTaskModal({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const { t } = useTranslation("projects");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  const titleError = titleTouched && !title.trim() ? t("newTask.titleRequired") : undefined;
  const canSubmit = title.trim().length > 0;

  function reset() {
    setTitle("");
    setTitleTouched(false);
  }

  async function handleCreate() {
    if (!canSubmit) return;
    setCreating(true);
    try {
      await api.post(`/projects/${projectId}/tasks`, { title: title.trim() });
      onCreated();
      reset();
      setOpen(false);
    } catch {
      toast.error(t("toast.createTaskFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="mr-1.5 size-4" />
        {t("newTask.trigger")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{t("newTask.title")}</DialogTitle>
          <DialogDescription>{t("newTask.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nt-title">{t("newTask.taskTitleLabel")}</Label>
            <input
              id="nt-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              onBlur={() => setTitleTouched(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder={t("newTask.placeholder")}
              aria-invalid={titleError ? "true" : undefined}
              aria-describedby={titleError ? "nt-title-error" : undefined}
              className={`${inputClass} ${
                titleError ? "border-destructive focus:ring-destructive/30" : ""
              }`}
            />
            {titleError && (
              <p id="nt-title-error" role="alert" className="text-xs text-destructive">
                {titleError}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={creating || !canSubmit}
            className="w-full sm:w-auto"
          >
            {creating ? <Spinner className="mr-2" /> : null}
            {creating ? t("newTask.saving") : t("newTask.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
