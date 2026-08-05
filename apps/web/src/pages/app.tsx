import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { HabitGrid } from "@/components/dashboard/habit-grid";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { InsightsRow } from "@/components/dashboard/insights-row";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { MonthNavigation } from "@/components/dashboard/month-navigation";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(user: { name: string | null; email: string }): string {
  if (user.name) return user.name;
  return user.email.split("@")[0] || user.email;
}

export default function DashboardPage() {
  const d = useDashboard();
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full flex-1 flex-col overflow-hidden px-6 py-6">
          {d.initialLoading ? (
            <DashboardSkeleton />
          ) : d.error ? (
            <ErrorState onRetry={d.reload} />
          ) : d.activeHabits.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon={<Sparkles className="size-8" />}
              title="Welcome to LifeOS"
              description={
                d.pillars.length === 0
                  ? "Start by creating your first pillar — habits need a pillar to live in."
                  : "Start by creating your first habit."
              }
              action={
                <Link
                  to={d.pillars.length === 0 ? "/settings/pillars" : "/settings/habits"}
                  className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {d.pillars.length === 0 ? "Create pillar" : "Create habit"}
                </Link>
              }
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-sm text-foreground/65">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {getGreeting()}, {user ? getDisplayName(user) : ""}
                  </h2>
                </div>
                <MonthNavigation
                  monthOffset={d.monthOffset}
                  label={d.targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  onPrev={() => d.setMonthOffset(d.monthOffset - 1)}
                  onNext={() => d.setMonthOffset(d.monthOffset + 1)}
                  onToday={() => d.setMonthOffset(0)}
                />
              </div>
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
