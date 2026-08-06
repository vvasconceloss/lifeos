import { toast } from "sonner";
import { api } from "@/lib/api";
import { AxiosError } from "axios";
import { useState } from "react";
import { Plus } from "lucide-react";
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
  archivedAt: string | null;
}

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

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
  const [frequency, setFrequency] = useState<HabitFrequency>("DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState("");
  const [timesPerMonth, setTimesPerMonth] = useState("");
  const [creating, setCreating] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [pillarTouched, setPillarTouched] = useState(false);
  const [freqTouched, setFreqTouched] = useState(false);

  const nameError = nameTouched && !name.trim() ? "Name is required" : undefined;
  const pillarError = pillarTouched && !pillarId ? "Select a pillar" : undefined;
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
    !!pillarId &&
    !(frequency === "WEEKLY_DAYS" && daysOfWeek.length === 0) &&
    !(frequency === "TIMES_PER_WEEK" && !timesPerWeek) &&
    !(frequency === "TIMES_PER_MONTH" && !timesPerMonth);

  function reset() {
    setName("");
    setDescription("");
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
      if (frequency === "WEEKLY_DAYS") payload.daysOfWeek = daysOfWeek;
      if (frequency === "TIMES_PER_WEEK") payload.timesPerWeek = Number(timesPerWeek);
      if (frequency === "TIMES_PER_MONTH") payload.timesPerMonth = Number(timesPerMonth);

      const res = await api.post<{ habit: Habit }>("/habits", payload);
      onCreated(res.data.habit);
      reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error("Check the habit details and try again.");
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
            <Label htmlFor="nh-desc">Description (optional)</Label>
            <input
              id="nh-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Run 5km"
              className={inputClass}
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

          <FrequencyFields
            frequency={frequency}
            daysOfWeek={daysOfWeek}
            timesPerWeek={timesPerWeek}
            timesPerMonth={timesPerMonth}
            error={freqError}
            idPrefix="nh"
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
            {creating ? "Saving..." : "Save Habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
