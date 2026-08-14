import { toast } from "sonner";
import { api } from "@/lib/api";
import { AxiosError } from "axios";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FrequencyFields } from "@/components/frequency-fields";
import type { HabitFrequency } from "@lifeos/shared";
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
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  archivedAt: string | null;
}

const HABIT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

export function NewHabitModal({
  pillars,
  onCreated,
}: {
  pillars: Pillar[];
  onCreated: (habit: Habit) => void;
}) {
  const { t } = useTranslation("habits");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState("");
  const [timesPerMonth, setTimesPerMonth] = useState("");
  const [creating, setCreating] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [pillarTouched, setPillarTouched] = useState(false);
  const [freqTouched, setFreqTouched] = useState(false);

  const nameError = nameTouched && !name.trim() ? t("newHabit.nameRequired") : undefined;
  const pillarError = pillarTouched && !pillarId ? t("newHabit.selectPillar") : undefined;
  const freqError = !freqTouched
    ? undefined
    : frequency === "WEEKLY_DAYS" && daysOfWeek.length === 0
      ? t("newHabit.selectDayOfWeek")
      : frequency === "TIMES_PER_WEEK" && !timesPerWeek
        ? t("newHabit.enterTimesPerWeek")
        : frequency === "TIMES_PER_MONTH" && !timesPerMonth
          ? t("newHabit.enterTimesPerMonth")
          : undefined;

  const canSubmit =
    name.trim().length > 0 &&
    !!pillarId &&
    !(frequency === "WEEKLY_DAYS" && daysOfWeek.length === 0) &&
    !(frequency === "TIMES_PER_WEEK" && !timesPerWeek) &&
    !(frequency === "TIMES_PER_MONTH" && !timesPerMonth);

  function reset() {
    setName("");
    setDescription("");
    setIcon("");
    setColor("");
    setPillarId("");
    setFrequency("DAILY");
    setDaysOfWeek([]);
    setTimesPerWeek("");
    setTimesPerMonth("");
    setNameTouched(false);
    setPillarTouched(false);
    setFreqTouched(false);
  }

  async function handleCreate() {
    if (!canSubmit) return;

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        pillarId,
        frequency,
      };
      if (description.trim()) payload.description = description.trim();
      if (icon.trim()) payload.icon = icon.trim();
      if (color) payload.color = color;
      if (frequency === "WEEKLY_DAYS") payload.daysOfWeek = daysOfWeek;
      if (frequency === "TIMES_PER_WEEK") payload.timesPerWeek = Number(timesPerWeek);
      if (frequency === "TIMES_PER_MONTH") payload.timesPerMonth = Number(timesPerMonth);

      const res = await api.post<{ habit: Habit }>("/habits", payload);
      onCreated(res.data.habit);
      reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error(t("newHabit.checkDetailsError"));
      } else {
        toast.error(t("newHabit.createFailed"));
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
        {t("newHabit.new")}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("newHabit.title")}</DialogTitle>
          <DialogDescription>
            {t("newHabit.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="nh-name">{t("newHabit.name")}</Label>
            <input
              id="nh-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              onBlur={() => setNameTouched(true)}
              placeholder={t("newHabit.namePlaceholder")}
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "nh-name-error" : undefined}
              className={`${inputClass} ${
                nameError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                  : ""
              }`}
            />
            {nameError && (
              <p id="nh-name-error" role="alert" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nh-desc">{t("newHabit.descriptionLabel")}</Label>
            <input
              id="nh-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("newHabit.descriptionPlaceholder")}
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nh-icon">{t("newHabit.iconLabel")}</Label>
            <input
              id="nh-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder={t("newHabit.iconPlaceholder")}
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("newHabit.colorLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(active ? "" : c)}
                    className="relative flex size-7 items-center justify-center rounded-full transition-all"
                    style={{ backgroundColor: c }}
                    aria-label={t("newHabit.colorAria", { color: c })}
                    aria-pressed={active}
                  >
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full ring-2 ring-foreground ring-offset-1 ring-offset-background">
                        <Check className="size-3.5 text-white drop-shadow-md" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nh-pillar">{t("newHabit.pillar")}</Label>
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
                <SelectValue placeholder={t("newHabit.selectPillar")}>
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

          <FrequencyFields
            frequency={frequency}
            daysOfWeek={daysOfWeek}
            timesPerWeek={timesPerWeek}
            timesPerMonth={timesPerMonth}
            error={freqError}
            idPrefix="nh"
            className="contents"
            onFrequency={setFrequency}
            onDaysOfWeek={setDaysOfWeek}
            onTimesPerWeek={setTimesPerWeek}
            onTimesPerMonth={setTimesPerMonth}
            onTouched={() => setFreqTouched(true)}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={creating || !canSubmit}
            className="w-full sm:w-auto"
          >
            {creating ? <Spinner className="mr-2" /> : null}
            {creating ? t("newHabit.saving") : t("newHabit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
