import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { BedDouble, BookOpenCheck, Smile, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DailyLogCorrelations, DailyLogResponse } from "@lifeos/shared";
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

function toneBarClass(score: number | null): string {
  if (score == null) return "bg-border/60";
  if (score <= 2) return "bg-red-500";
  if (score <= 4) return "bg-orange-500";
  if (score <= 7) return "bg-amber-500";
  if (score <= 8) return "bg-emerald-500";
  return "bg-emerald-600";
}

function sleepScore(hours: number): number {
  if (hours < 5) return 2;
  if (hours < 6.5) return 4;
  if (hours < 7) return 6;
  if (hours <= 9) return 9;
  if (hours <= 10) return 8;
  return 6;
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
  const [sleepH, setSleepH] = useState(log?.sleepHours != null ? String(Math.floor(log.sleepHours)) : "");
  const [sleepM, setSleepM] = useState(log?.sleepHours != null ? String(Math.round((log.sleepHours % 1) * 60)) : "");
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
      if (sleepH !== "") {
        const hours = Math.max(0, Math.min(24, Number(sleepH) || 0));
        const minutes = hours >= 24 ? 0 : Math.max(0, Math.min(59, Number(sleepM) || 0));
        payload.sleepHours = hours + minutes / 60;
      }
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
    <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div>
        <span className="text-xs font-medium text-foreground/60">Log entry</span>
        <p className="text-sm font-semibold text-foreground">{formatFullDate(date)}</p>
      </div>

      <div className="grid gap-4">
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
          <span className="text-xs font-medium text-foreground/60">Sleep</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="j-sleep-h" className="text-[10px] text-foreground/50">
                Hours
              </label>
              <input
                id="j-sleep-h"
                type="number"
                min={0}
                max={24}
                step={1}
                value={sleepH}
                onChange={(e) => setSleepH(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="j-sleep-m" className="text-[10px] text-foreground/50">
                Minutes
              </label>
              <input
                id="j-sleep-m"
                type="number"
                min={0}
                max={59}
                step={1}
                value={sleepM}
                onChange={(e) => setSleepM(e.target.value)}
                placeholder="00"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="j-notes" className="text-xs font-medium text-foreground/60">
            Notes
          </label>
          <textarea
            id="j-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="How did the day go?"
            className={inputClass}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isFuture}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
  max,
  unit,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  max: number;
  unit?: string;
  tone: string;
}) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;

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
          <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function CorrelationRow({ label, days }: { label: string; days: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate text-sm font-medium text-foreground">{label}</span>
      <span className="shrink-0 min-w-[4rem] whitespace-nowrap text-right text-2xl font-bold tabular-nums leading-none text-foreground">
        {days}
        <span className="ml-1 text-xs font-medium text-foreground/50">d</span>
      </span>
    </div>
  );
}

function CorrelationsCard({ correlations }: { correlations: DailyLogCorrelations }) {
  const groups = [
    { title: "Mood", icon: <Smile className="size-4" />, rows: correlations.mood },
    { title: "Energy", icon: <Zap className="size-4" />, rows: correlations.energy },
    { title: "Sleep", icon: <BedDouble className="size-4" />, rows: correlations.sleep },
  ];
  const hasData = groups.some((g) => g.rows.length > 0);

  return (
    <div data-testid="logged-days-by-state" className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <span className="text-xs font-medium text-foreground/60">Your logged days by state</span>
      {!hasData ? (
        <p className="mt-3 text-sm text-foreground/60">
          Log a few days (mood, energy or sleep) to see how your days are distributed across these
          buckets.
        </p>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {groups.map((g) =>
            g.rows.length > 0 ? (
              <div key={g.title} className="flex flex-col gap-3">
                <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-foreground">
                  <span className="shrink-0 text-foreground/50">{g.icon}</span>
                  {g.title}
                </span>
                {g.rows.map((row) => (
                  <CorrelationRow key={row.label} label={row.label} days={row.days} />
                ))}
              </div>
            ) : null,
          )}
        </div>
      )}
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
  const [correlations, setCorrelations] = useState<DailyLogCorrelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [correlationsReload, setCorrelationsReload] = useState(0);
  const correlationsMonth = useRef("");

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

    async function loadCorrelations() {
      const monthKey = `${from}-${to}`;
      if (correlationsMonth.current !== monthKey) {
        correlationsMonth.current = monthKey;
        setCorrelations(null);
      }
      try {
        const res = await api.get<{ correlations: DailyLogCorrelations }>(`/daily-logs/correlations?from=${from}&to=${to}`);
        if (!cancelled) setCorrelations(res.data.correlations);
      } catch {
        if (!cancelled) setCorrelations(null);
      }
    }

    load();
    loadCorrelations();
    return () => {
      cancelled = true;
    };
  }, [from, to, reloadKey, correlationsReload]);

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
    setCorrelationsReload((k) => k + 1);
  }

  function goToday() {
    setMonthOffset(0);
    const now = new Date();
    setSelectedDate(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`);
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-foreground/50">
              <Spinner />
            </div>
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
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

              <div className="grid gap-6 lg:grid-cols-2">
                <LogForm key={selectedDate} date={selectedDate} log={selectedLog} onSaved={handleSaved} />

                <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                  <span className="text-xs font-medium text-foreground/60">Monthly calendar</span>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-foreground/40">
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
                  <p className="text-[10px] text-foreground/50">
                    Logged days are colored by mood &amp; energy (the stronger the green, the better the day).
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-foreground/60">Your daily state this month</span>
                  <span className="text-[10px] text-foreground/60">
                    {loggedDays} logged day{loggedDays === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  <StateCard
                    icon={<Smile className="size-4" />}
                    label="Mood"
                    value={avgMood}
                    max={10}
                    unit="/10"
                    tone={toneBarClass(avgMood)}
                  />
                  <StateCard
                    icon={<Zap className="size-4" />}
                    label="Energy"
                    value={avgEnergy}
                    max={10}
                    unit="/10"
                    tone={toneBarClass(avgEnergy)}
                  />
                  <StateCard
                    icon={<BedDouble className="size-4" />}
                    label="Sleep"
                    value={avgSleep}
                    max={12}
                    unit="h"
                    tone={toneBarClass(avgSleep != null ? sleepScore(avgSleep) : null)}
                  />
                </div>
                <p className="mt-4 border-t border-border/40 pt-3 text-[10px] text-foreground/60">
                  Monthly averages of the values you logged. Bars are drawn on each metric's own
                  scale (mood/energy 1–10, sleep 0–12h) and colored by how good the value is.
                </p>
              </div>

              {correlations ? <CorrelationsCard correlations={correlations} /> : null}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
