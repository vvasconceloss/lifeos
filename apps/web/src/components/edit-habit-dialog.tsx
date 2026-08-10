import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState } from "react";
import { Check, Pencil } from "lucide-react";
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

export function EditHabitDialog({
  habit,
  pillars,
  onUpdated,
}: {
  habit: Habit;
  pillars: Pillar[];
  onUpdated: (habit: Habit) => void;
}) {
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
  const [saving, setSaving] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [freqTouched, setFreqTouched] = useState(false);

  function syncFromHabit() {
    setName(habit.name);
    setDescription(habit.description ?? "");
    setIcon(habit.icon ?? "");
    setColor(habit.color ?? "");
    setPillarId(habit.pillarId);
    setFrequency(habit.frequency);
    setDaysOfWeek(habit.daysOfWeek);
    setTimesPerWeek(habit.timesPerWeek ? String(habit.timesPerWeek) : "");
    setTimesPerMonth(habit.timesPerMonth ? String(habit.timesPerMonth) : "");
    setNameTouched(false);
    setFreqTouched(false);
  }

  const nameError = nameTouched && !name.trim() ? "Name is required" : undefined;
  const freqError = !freqTouched
    ? undefined
    : frequency === "WEEKLY_DAYS" && daysOfWeek.length === 0
      ? "Select at least one day of the week"
      : frequency === "TIMES_PER_WEEK" && !timesPerWeek
        ? "Enter how many times per week"
        : frequency === "TIMES_PER_MONTH" && !timesPerMonth
          ? "Enter how many times per month"
          : undefined;

  const canSubmit =
    name.trim().length > 0 &&
    !(frequency === "WEEKLY_DAYS" && daysOfWeek.length === 0) &&
    !(frequency === "TIMES_PER_WEEK" && !timesPerWeek) &&
    !(frequency === "TIMES_PER_MONTH" && !timesPerMonth);

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || null,
        color: color || null,
        ...(pillarId ? { pillarId } : {}),
        frequency,
      };
      if (frequency === "WEEKLY_DAYS") payload.daysOfWeek = daysOfWeek;
      if (frequency === "TIMES_PER_WEEK") payload.timesPerWeek = Number(timesPerWeek);
      if (frequency === "TIMES_PER_MONTH") payload.timesPerMonth = Number(timesPerMonth);

      const res = await api.patch<{ habit: Habit }>(`/habits/${habit.id}`, payload);
      onUpdated(res.data.habit);
      toast.success("Habit updated");
      setOpen(false);
    } catch {
      toast.error("Failed to update habit");
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
        if (o) syncFromHabit();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-md p-1.5 text-foreground/60 hover:text-foreground"
            aria-label={`Edit ${habit.name}`}
          >
            <Pencil className="size-4" />
          </button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit habit</DialogTitle>
          <DialogDescription>Update the habit details and schedule.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="eh-name">Habit name</Label>
            <input
              id="eh-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              onBlur={() => setNameTouched(true)}
              placeholder="e.g. Morning run"
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "eh-name-error" : undefined}
              className={`${inputClass} ${
                nameError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                  : ""
              }`}
            />
            {nameError && (
              <p id="eh-name-error" role="alert" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eh-desc">Description (optional)</Label>
            <input
              id="eh-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Run 5km"
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eh-icon">Icon (optional)</Label>
            <input
              id="eh-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🏃"
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label>Color (optional)</Label>
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
                    aria-label={`Color ${c}`}
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
            <Label htmlFor="eh-pillar">Pillar</Label>
            <Select value={pillarId} onValueChange={(v) => setPillarId(v ?? "")}>
              <SelectTrigger id="eh-pillar" className="w-full">
                <SelectValue>
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
          </div>

          <FrequencyFields
            frequency={frequency}
            daysOfWeek={daysOfWeek}
            timesPerWeek={timesPerWeek}
            timesPerMonth={timesPerMonth}
            error={freqError}
            idPrefix="eh"
            className="contents"
            onFrequency={setFrequency}
            onDaysOfWeek={setDaysOfWeek}
            onTimesPerWeek={setTimesPerWeek}
            onTimesPerMonth={setTimesPerMonth}
            onTouched={() => setFreqTouched(true)}
          />
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
