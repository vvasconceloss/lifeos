import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { BedDouble, BookOpenCheck, Smile, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { DailyLogResponse } from "@lifeos/shared";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { MonthNavigation } from "@/components/dashboard/month-navigation";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RATING_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function stateScore(log: { mood: number | null; energy: number | null }): number | null {
  const values = [log.mood, log.energy].filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stateClass(score: number | null): string {
  if (score == null) return "bg-border/40 text-foreground/60";
  if (score <= 2) return "bg-red-500/40 text-foreground";
  if (score <= 4) return "bg-orange-500/35 text-foreground";
  if (score <= 6) return "bg-amber-500/35 text-foreground";
  if (score <= 8) return "bg-emerald-500/40 text-foreground";
  return "bg-emerald-500/70 text-foreground";
}

function formatFullDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function buildMonthCells(monthDays: string[], logsByDate: Map<string, DailyLogResponse>) {
  const offset = (new Date(`${monthDays[0]}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  const cells: ({ date: string; log?: DailyLogResponse } | null)[] = Array(offset).fill(null);
  for (const date of monthDays) {
    cells.push({ date, log: logsByDate.get(date) });
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

function LogForm({
  date,
  log,
  onSaved,
}: {
  date: string;
  log?: DailyLogResponse;
  onSaved: (log: DailyLogResponse) => void;
}) {
  const [mood, setMood] = useState<number | null>(log?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(log?.energy ?? null);
  const [sleepHours, setSleepHours] = useState(log?.sleepHours != null ? String(log.sleepHours) : "");
  const [notes, setNotes] = useState(log?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const isFuture = date > todayKey;

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { date };
      if (mood != null) payload.mood = mood;
      if (energy != null) payload.energy = energy;
      if (sleepHours) payload.sleepHours = Number(sleepHours);
      if (notes.trim()) payload.notes = notes.trim();

      const res = await api.post<{ log: DailyLogResponse }>("/daily-logs", payload);
      onSaved(res.data.log);
      toast.success("Journal saved");
    } catch {
      toast.error("Failed to save journal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="shrink-0">
        <span className="text-xs font-medium text-foreground/60">Log entry</span>
        <p className="text-sm font-semibold text-foreground">{formatFullDate(date)}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-2">
          <span className="text-xs font-medium text-foreground/60">Mood</span>
          <div className="flex flex-wrap gap-1">
            {RATING_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMood(v)}
                aria-pressed={mood === v}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                  mood === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/70 hover:bg-accent",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-medium text-foreground/60">Energy</span>
          <div className="flex flex-wrap gap-1">
            {RATING_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setEnergy(v)}
                aria-pressed={energy === v}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                  energy === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/70 hover:bg-accent",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="j-sleep" className="text-xs font-medium text-foreground/60">
            Sleep (hours)
          </label>
          <input
            id="j-sleep"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            placeholder="e.g. 7.5"
            className={inputClass}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <label htmlFor="j-notes" className="shrink-0 text-xs font-medium text-foreground/60">
            Notes
          </label>
          <textarea
            id="j-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={`${inputClass} min-h-20 flex-1 resize-y`}
            placeholder="How did the day go?"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isFuture}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Spinner className="size-4" /> : null}
          {saving ? "Saving..." : isFuture ? "Future days can't be logged" : log ? "Update entry" : "Save entry"}
        </button>
      </div>
    </div>
  );
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function StateCard({
  icon,
  label,
  value,
  scale,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  scale: number;
  unit?: string;
}) {
  const pct = value != null ? Math.min(100, (value / scale) * 100) : 0;

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-foreground/50">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-lg font-bold tabular-nums text-foreground">
            {value != null ? `${value.toFixed(1)}${unit ?? ""}` : "—"}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function JournalPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  });

  const targetDate = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + monthOffset, 1));
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthDays = Array.from({ length: lastDay }, (_, i) => `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
  const from = monthDays[0];
  const to = monthDays[monthDays.length - 1];

  const [logs, setLogs] = useState<DailyLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(false);
      try {
        const logsRes = await api.get<{ logs: DailyLogResponse[] }>(`/daily-logs?from=${from}&to=${to}`);
        if (cancelled) return;
        setLogs(logsRes.data.logs);
      } catch (e) {
        if (!cancelled && !isUnauthorizedError(e)) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, reloadKey]);

  const logsByDate = new Map(logs.map((l) => [l.date, l]));
  const selectedLog = logsByDate.get(selectedDate);
  const cells = buildMonthCells(monthDays, logsByDate);
  const now = new Date();
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  const avgMood = average(logs.filter((l) => l.mood != null).map((l) => l.mood as number));
  const avgEnergy = average(logs.filter((l) => l.energy != null).map((l) => l.energy as number));
  const avgSleep = average(logs.filter((l) => l.sleepHours != null).map((l) => l.sleepHours as number));
  const loggedDays = new Set(logs.map((l) => l.date)).size;

  function retry() {
    setError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  function handleSaved(saved: DailyLogResponse) {
    setLogs((prev) => [...prev.filter((l) => l.date !== saved.date), saved].sort((a, b) => a.date.localeCompare(b.date)));
  }

  function goToday() {
    setMonthOffset(0);
    const now = new Date();
    setSelectedDate(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`);
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6 lg:overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-foreground/50">
              <Spinner />
            </div>
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="size-5 text-foreground/60" aria-hidden />
                  <span className="text-xs font-medium text-foreground/60">Daily journal</span>
                </div>
                <MonthNavigation
                  monthOffset={monthOffset}
                  label={targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  onPrev={() => setMonthOffset(monthOffset - 1)}
                  onNext={() => setMonthOffset(monthOffset + 1)}
                  onToday={goToday}
                />
              </div>

              <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
                <LogForm key={selectedDate} date={selectedDate} log={selectedLog} onSaved={handleSaved} />

                <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <span className="shrink-0 text-xs font-medium text-foreground/60">Monthly calendar</span>
                  <div className="grid shrink-0 grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-foreground/40">
                    {WEEKDAY_LABELS.map((l) => (
                      <div key={l}>{l}</div>
                    ))}
                  </div>
                  <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] gap-1.5">
                    {cells.map((cell, i) =>
                      cell ? (
                        <button
                          key={cell.date}
                          type="button"
                          disabled={cell.date > todayKey}
                          onClick={() => setSelectedDate(cell.date)}
                          aria-label={`${cell.date}${cell.log ? " (logged)" : ""}`}
                          className={cn(
                            "flex min-h-0 items-center justify-center rounded-md text-xs tabular-nums transition-colors disabled:cursor-not-allowed",
                            cell.date > todayKey
                              ? "text-foreground/40"
                              : cell.log
                                ? stateClass(stateScore(cell.log))
                                : "border border-border/40 text-foreground/60 hover:bg-accent",
                            cell.date === selectedDate && "ring-2 ring-ring ring-offset-1 ring-offset-background",
                          )}
                        >
                          {parseInt(cell.date.split("-")[2], 10)}
                        </button>
                      ) : (
                        <div key={`empty-${i}`} />
                      ),
                    )}
                  </div>
                  <p className="shrink-0 text-[10px] text-foreground/50">
                    Logged days are colored by mood &amp; energy (the stronger the green, the better the day).
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-foreground/60">Your daily state this month</span>
                  <span className="text-[10px] text-foreground/60">
                    {loggedDays} logged day{loggedDays === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  <StateCard icon={<Smile className="size-4" />} label="Mood" value={avgMood} scale={10} unit="/10" />
                  <StateCard icon={<Zap className="size-4" />} label="Energy" value={avgEnergy} scale={10} unit="/10" />
                  <StateCard icon={<BedDouble className="size-4" />} label="Sleep" value={avgSleep} scale={10} unit="h" />
                </div>
                <p className="mt-4 border-t border-border/40 pt-3 text-[10px] text-foreground/60">
                  Monthly averages of the values you logged. The bar shows your average on a 0–10 scale.
                </p>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
