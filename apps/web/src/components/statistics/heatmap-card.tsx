import { toast } from "sonner";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

interface HeatmapDay {
  date: string;
  count: number;
  level: number;
}

interface HeatmapResponse {
  year: number;
  month: number | null;
  maxCount: number;
  days: HeatmapDay[];
}

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVEL_CLASSES = [
  "bg-border/40",
  "bg-emerald-500/30",
  "bg-emerald-500/60",
  "bg-emerald-500",
];

function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatFullDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function buildYearGrid(days: HeatmapDay[], year: number) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const daysInYear = days.length;
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const offset = (jan1.getUTCDay() + 6) % 7;
  const weeks = Math.ceil((daysInYear + offset) / 7);

  const columns: { day: HeatmapDay | null; key: string }[][] = [];
  const monthLabels: (string | null)[] = [];
  let prevMonth = -1;

  for (let w = 0; w < weeks; w++) {
    const column: { day: HeatmapDay | null; key: string }[] = [];
    let label: string | null = null;

    for (let r = 0; r < 7; r++) {
      const dayIndex = w * 7 + r - offset;

      if (dayIndex < 0 || dayIndex >= daysInYear) {
        column.push({ day: null, key: `w${w}r${r}` });
      } else {
        const date = new Date(Date.UTC(year, 0, 1 + dayIndex));
        const key = toDateKey(date);
        const month = date.getUTCMonth();

        if (month !== prevMonth) {
          label = MONTH_LABELS[month];
          prevMonth = month;
        }

        column.push({
          day: byDate.get(key) ?? { date: key, count: 0, level: 0 },
          key,
        });
      }
    }

    columns.push(column);
    monthLabels.push(label);
  }

  return { columns, monthLabels };
}

export function HeatmapCard({ year }: { year: number }) {
  const [data, setData] = useState<HeatmapResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get<HeatmapResponse>(`/stats/heatmap?year=${year}`);
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) toast.error("Failed to load heatmap");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const { columns, monthLabels } = data
    ? buildYearGrid(data.days, data.year)
    : { columns: [], monthLabels: [] };
  const isEmpty = data !== null && data.days.every((d) => d.count === 0);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground/60">Activity</span>
        <span className="text-[10px] text-foreground/50">{year}</span>
      </div>

      {!data ? (
        <div className="flex h-24 items-center justify-center">
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        </div>
      ) : isEmpty ? (
        <p className="py-3 text-center text-xs text-foreground/45">
          No completions recorded in {year}.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-[3px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="h-[13px]" />
              {WEEKDAY_LABELS.map((label, r) => (
                <div
                  key={r}
                  className="flex aspect-square w-full items-center justify-center overflow-hidden text-[9px] leading-none text-foreground/40"
                >
                  {label}
                </div>
              ))}
            </div>
            {columns.map((column, w) => (
              <div key={w} className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <div className="h-[13px] truncate text-[9px] leading-[13px] text-foreground/40">
                  {monthLabels[w] ?? ""}
                </div>
                {column.map((cell) =>
                  cell.day ? (
                    <div key={cell.key} className="group relative aspect-square w-full">
                      <div className={`size-full rounded-[2px] ${LEVEL_CLASSES[cell.day.level]}`} />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md group-hover:block">
                        <div>{formatFullDate(cell.day.date)}</div>
                        <div className="font-semibold">
                          {cell.day.count} completion{cell.day.count === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={cell.key} className="aspect-square w-full" />
                  ),
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-1">
            <span className="text-[9px] text-foreground/40">Less</span>
            {LEVEL_CLASSES.map((cls, level) => (
              <div key={level} className={`h-[10px] w-[10px] rounded-[2px] ${cls}`} />
            ))}
            <span className="text-[9px] text-foreground/40">More</span>
          </div>
        </div>
      )}
    </div>
  );
}
