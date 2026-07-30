import { Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HabitGrid } from "@/components/dashboard/habit-grid";
import { ProtectedRoute } from "@/components/protected-route";
import { InsightsRow } from "@/components/dashboard/insights-row";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { MonthNavigation } from "@/components/dashboard/month-navigation";

function Spinner() {
  return <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}

export default function DashboardPage() {
  const d = useDashboard();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full flex-1 flex-col overflow-hidden px-6 py-6">
          {d.initialLoading ? (
            <div className="flex flex-1 items-center justify-center"><Spinner /></div>
          ) : d.activeHabits.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h2 className="mb-2 text-xl font-semibold text-foreground">Welcome to LifeOS</h2>
              <p className="mb-6 text-sm text-foreground/65">Start by creating your first habit.</p>
              <Link to="/settings/habits" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Create habit</Link>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <MonthNavigation
                monthOffset={d.monthOffset}
                label={d.targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                onPrev={() => d.setMonthOffset(d.monthOffset - 1)}
                onNext={() => d.setMonthOffset(d.monthOffset + 1)}
                onToday={() => d.setMonthOffset(0)}
              />
              <InsightsRow
                chartData={d.chartData}
                habitProgress={d.habitProgress}
                totalCompleted={d.totalCompleted}
                totalPossible={d.totalPossible}
                successRate={d.successRate}
                last7={d.last7}
                momentumAvg={d.momentumAvg}
                max7={d.max7}
              />
              <HabitGrid
                grouped={d.grouped}
                monthDays={d.monthDays}
                todayStr={d.todayStr}
                completions={d.completions}
                togglingId={d.togglingId}
                totalCompleted={d.totalCompleted}
                successRate={d.successRate}
                onToggle={d.toggleCell}
              />
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
