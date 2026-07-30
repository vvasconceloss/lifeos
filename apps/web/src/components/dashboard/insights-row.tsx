import { PieChart, Pie, Cell } from "recharts";
import type { ChartData, HabitProgress } from "./types";
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";

export function InsightsRow({
  chartData,
  habitProgress,
  totalCompleted,
  totalPossible,
  successRate,
  last7,
  momentumAvg,
  max7,
}: {
  chartData: ChartData[];
  habitProgress: HabitProgress[];
  totalCompleted: number;
  totalPossible: number;
  successRate: number;
  last7: ChartData[];
  momentumAvg: number;
  max7: number;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex flex-1 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <span className="mb-2 text-xs font-medium text-foreground/60">Daily completions</span>
        <div className="flex-1" style={{ minHeight: 64 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <XAxis dataKey="day" tick={{ fontSize: 8, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} interval={3} />
              <YAxis allowDecimals={false} tick={{ fontSize: 8, fontFamily: "monospace", fill: "var(--foreground)" }} axisLine={false} tickLine={false} width={18} />
              <ReTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, padding: "4px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
              <Line type="natural" dataKey="completions" stroke="var(--primary)" strokeWidth={3} dot={{ r: 2, fill: "var(--primary)" }} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex w-56 shrink-0 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <span className="mb-2 text-xs font-medium text-foreground/60">Per habit</span>
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          {habitProgress.slice(0, 5).map((hp) => (
            <div key={hp.habitId} className="flex items-center gap-2 text-xs">
              <div className="h-1.5 w-full max-w-20 overflow-hidden rounded-full bg-border/60">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${hp.goal > 0 ? Math.round((hp.completed / hp.goal) * 100) : 0}%` }} />
              </div>
              <span className="shrink-0 text-foreground/70 truncate">{hp.habitName}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-48 shrink-0 flex-col justify-center gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <PieChart width={45} height={45}>
            <Pie data={[{ name: "Done", value: totalCompleted }, { name: "", value: Math.max(totalPossible - totalCompleted, 0) }]}
              cx={15} cy={20} innerRadius={14} outerRadius={20} dataKey="value" startAngle={90} endAngle={-270}>
              <Cell fill="var(--primary)" /><Cell fill="var(--border)" />
            </Pie>
          </PieChart>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{successRate}%</div>
            <div className="text-[10px] text-foreground/50">monthly progress</div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border/40 pt-3">
          <div className="flex items-end gap-px" style={{ width: 40, height: 22 }}>
            {last7.map((d, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max((d.completions / max7) * 22, 2)}px`, backgroundColor: "var(--primary)", opacity: 0.3 + (d.completions / max7) * 0.7 }} />
            ))}
          </div>
          <div>
            <div className="tabular-nums text-sm font-semibold text-foreground">{momentumAvg}/d</div>
            <div className="text-[10px] text-foreground/50">7-day avg</div>
          </div>
        </div>
      </div>
    </div>
  );
}
