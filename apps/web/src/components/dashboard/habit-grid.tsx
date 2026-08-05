import { CheckSquare } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MobileHabitList } from "@/components/dashboard/mobile-habit-list";
import { expectedForMonth } from "@/lib/frequency";
import type { Completion, HabitsGrouped } from "./types";

export function HabitGrid({
  grouped,
  monthDays,
  todayStr,
  completions,
  togglingId,
  totalCompleted,
  successRate,
  onToggle,
}: {
  grouped: HabitsGrouped;
  monthDays: string[];
  todayStr: string;
  completions: Completion[];
  togglingId: string | null;
  totalCompleted: number;
  successRate: number;
  onToggle: (habitId: string, date: string) => void;
}) {
  function isCompleted(habitId: string, date: string) {
    return completions.some((c) => c.habitId === habitId && c.date.startsWith(date));
  }

  const [gridYear, gridMonth] = (monthDays[0] ?? "2000-01").split("-").map(Number);

  function goalFor(habit: (typeof grouped)[string][number]): number {
    return expectedForMonth(
      habit.frequency,
      habit.daysOfWeek,
      habit.timesPerWeek,
      habit.timesPerMonth,
      gridYear,
      gridMonth,
    );
  }

  function formatCellDate(date: string): string {
    return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <>
      <div className="hidden flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm md:flex">
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
        <div className="flex w-max min-w-full shrink-0 border-b border-border text-xs font-medium text-foreground/60">
          <div className="sticky left-0 z-[5] flex w-27.5 shrink-0 items-center bg-card px-3 py-3 text-left">Habit</div>
          <div className="flex w-11 shrink-0 items-center justify-center py-3">Goal</div>
          <div className="flex flex-1 items-center">
            {monthDays.map((d) => {
              const day = parseInt(d.split("-")[2]);
              const isToday = d === todayStr;
              const isFuture = d > todayStr;
              return (
                <div key={d} className={`flex min-w-6 flex-1 items-center justify-center py-3 text-center font-mono text-[11px] leading-none ${isToday ? "font-bold text-foreground" : isFuture ? "text-foreground/25" : "text-foreground/65"}`}>
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex w-12 shrink-0 items-center justify-center py-3">%</div>
        </div>
        <div className="min-h-0 w-max min-w-full flex-1 overflow-y-auto overflow-x-clip scroll-subtle">
          {Object.entries(grouped).map(([pillarName, hbts], gi) => (
            <div key={pillarName}>
              <div className={`sticky top-0 z-10 bg-card px-3 py-2 text-xs font-semibold text-foreground/70 ${gi > 0 ? "border-t border-border/40" : ""}`}>
                {pillarName}
              </div>
              {hbts.map((habit) => {
                const actualCompleted = monthDays.filter((d) => isCompleted(habit.id, d)).length;
                const goal = goalFor(habit);
                const pct = Math.round((actualCompleted / goal) * 100);
                return (
                  <div key={habit.id} className="flex border-b border-border/20 last:border-0 hover:bg-accent/20">
                    <div className="sticky left-0 z-[5] flex w-27.5 shrink-0 items-center gap-2 border-l-[3px] bg-card pl-3 pr-1.5 py-3 text-foreground" style={{ borderLeftColor: habit.color }}>
                      <span className="truncate text-xs">{habit.name}</span>
                    </div>
                  <div className="flex w-11 shrink-0 items-center justify-center font-mono text-xs tabular-nums text-foreground/60">
                    {actualCompleted}/{goal}
                  </div>
                    <div className="flex flex-1 items-center">
                      {monthDays.map((date) => {
                        const done = isCompleted(habit.id, date);
                        const cellKey = `${habit.id}-${date}`;
                        const isToday = date === todayStr;
                        const isFuture = date > todayStr;
                        return (
                          <div key={date} className={`flex min-w-6 flex-1 items-center justify-center ${isToday ? "bg-accent/20" : ""}`}>
                            {isFuture ? (
                              <div className="size-6" />
                            ) : (
                              <button
                                onClick={() => onToggle(habit.id, date)}
                                disabled={togglingId === cellKey}
                                className={`flex size-6 cursor-pointer items-center justify-center rounded-md transition-all ${done ? "" : "hover:bg-accent"} disabled:opacity-30`}
                                aria-label={done ? `Unmark ${habit.name} on ${formatCellDate(date)}` : `Mark ${habit.name} on ${formatCellDate(date)}`}
                              >
                                {done ? (
                                  <div className="habit-checkbox flex size-5 items-center justify-center rounded-[4px]" style={{ backgroundColor: habit.color }}>
                                    <CheckSquare className="size-3.5 text-white" />
                                  </div>
                                ) : togglingId === cellKey ? (
                                  <Spinner />
                                ) : (
                                  <div className="size-5 rounded-[4px] border border-foreground/20" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex w-12 shrink-0 items-center justify-center pr-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: habit.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* Total row — always at the bottom of the grid */}
        <div className="flex w-max min-w-full shrink-0 border-t border-border bg-card text-xs font-semibold text-foreground/70">
          <div className="sticky left-0 z-[5] flex w-27.5 shrink-0 items-center bg-card px-3 py-3 text-left">Total</div>
          <div className="flex w-11 shrink-0 items-center justify-center py-3 font-mono tabular-nums">{totalCompleted}</div>
          <div className="flex flex-1 items-center">
            {monthDays.map((date) => {
              const total = completions.filter((c) => c.date.startsWith(date)).length;
              const isFuture = date > todayStr;
              return (
                <div key={date} className="flex min-w-6 flex-1 items-center justify-center py-3 text-center font-mono text-xs tabular-nums text-foreground">
                  {isFuture ? "" : total > 0 ? total : ""}
                </div>
              );
            })}
          </div>
          <div className="flex w-12 shrink-0 items-center justify-center py-3 pr-4 font-mono tabular-nums">{successRate}%</div>
        </div>
      </div>
      </div>
      <MobileHabitList
        grouped={grouped}
        monthDays={monthDays}
        todayStr={todayStr}
        completions={completions}
        togglingId={togglingId}
        onToggle={onToggle}
      />
    </>
  );
}
