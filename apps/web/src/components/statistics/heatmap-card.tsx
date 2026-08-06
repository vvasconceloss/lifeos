import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
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

function buildMonthGrid(days: HeatmapDay[], year: number, month: number) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (HeatmapDay | null)[] = [];

  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(byDate.get(key) ?? { date: key, count: 0, level: 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return { cells };
}

export function HeatmapCard({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = isMobile
          ? `/stats/heatmap?year=${year}&month=${month}`
          : `/stats/heatmap?year=${year}`;
        const res = await api.get<{ stats: HeatmapResponse }>(url);
        if (!cancelled) setData(res.data.stats);
      } catch (error) {
        if (!cancelled && !isUnauthorizedError(error)) toast.error("Failed to load heatmap");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, month, isMobile]);

  const monthLabel = MONTH_LABELS[month - 1];
  const emptyText = isMobile
    ? `No completions recorded in ${monthLabel} ${year}.`
    : `No completions recorded in ${year}.`;

  const { columns, monthLabels } =
    !isMobile && data
      ? buildYearGrid(data.days, data.year)
      : { columns: [], monthLabels: [] };
  const cells = isMobile && data ? buildMonthGrid(data.days, data.year, data.month ?? month).cells : [];
  const isEmpty = data !== null && data.days.every((d) => d.count === 0);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground/60">Activity</span>
        <span className="text-[10px] text-foreground/60">
          {isMobile ? `${monthLabel} ${year}` : year}
        </span>
      </div>

      {!data ? (
        <div className="flex h-24 items-center justify-center">
          <Spinner />
        </div>
      ) : isEmpty ? (
        <p className="py-3 text-center text-xs text-foreground/60">
          {emptyText}
        </p>
      ) : isMobile ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_LABELS.map((label, r) => (
              <div key={r} className="text-center text-[10px] leading-4 text-foreground/40">
                {label}
              </div>
            ))}
            {cells.map((cell, i) =>
              cell ? (
                <div
                  key={cell.date}
                  className={`size-full rounded-[4px] ${LEVEL_CLASSES[cell.level]}`}
                  role="img"
                  aria-label={`${formatFullDate(cell.date)} — ${cell.count} completion${cell.count === 1 ? "" : "s"}`}
                />
              ) : (
                <div key={`empty-${i}`} className="aspect-square" />
              ),
            )}
          </div>
          <div className="flex items-center justify-end gap-1">
            <span className="text-[9px] text-foreground/40">Less</span>
            {LEVEL_CLASSES.map((cls, level) => (
              <div key={level} className={`h-[10px] w-[10px] rounded-[2px] ${cls}`} />
            ))}
            <span className="text-[9px] text-foreground/40">More</span>
          </div>
        </div>
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
