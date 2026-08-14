import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState } from "react";
import { AxiosError } from "axios";
import { Check, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  icon: string | null;
  description: string | null;
  sortOrder: number;
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
  const { t } = useTranslation("habits");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [creating, setCreating] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const nameError = nameTouched && !name.trim() ? t("newPillar.nameRequired") : undefined;

  function reset() {
    setName("");
    setIcon("");
    setDescription("");
    setSelectedColor("");
    setNameTouched(false);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<{ pillar: Pillar }>("/pillars", {
        name: name.trim(),
        ...(selectedColor ? { color: selectedColor } : {}),
        ...(icon.trim() ? { icon: icon.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      onCreated(res.data.pillar);
      reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error(t("newPillar.checkDetailsError"));
      } else {
        toast.error(t("newPillar.createFailed"));
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-1.5 size-4" />
        {t("newPillar.new")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-110.25">
        <DialogHeader>
          <DialogTitle>{t("newPillar.title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="np-name">{t("newPillar.name")}</Label>
            <input
              id="np-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              onBlur={() => setNameTouched(true)}
              placeholder={t("newPillar.namePlaceholder")}
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "np-name-error" : undefined}
              className={`rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 ${
                nameError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                  : "border-input focus:ring-ring"
              }`}
            />
            {nameError && (
              <p id="np-name-error" role="alert" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="np-icon">{t("newPillar.iconLabel")}</Label>
            <input
              id="np-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder={t("newPillar.iconPlaceholder")}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="np-desc">{t("newPillar.descriptionLabel")}</Label>
            <textarea
              id="np-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t("newPillar.descriptionPlaceholder")}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("newPillar.colorsLabel")}</Label>
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
                    aria-label={t("newPillar.colorAria", { color: c })}
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
            {creating ? t("newPillar.saving") : t("newPillar.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
