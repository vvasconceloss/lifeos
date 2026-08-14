import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/app-layout";
import { HabitGrid } from "@/components/dashboard/habit-grid";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { InsightsRow } from "@/components/dashboard/insights-row";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { MonthNavigation } from "@/components/dashboard/month-navigation";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatLongDate, formatMonthYear } from "@/lib/i18n-format";
import { ErrorState } from "@/components/error-state";

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "greeting.morning";
  if (hour >= 12 && hour < 18) return "greeting.afternoon";
  return "greeting.evening";
}

function getDisplayName(user: { name: string | null; email: string }): string {
  if (user.name) return user.name;
  return user.email.split("@")[0] || user.email;
}

export default function DashboardPage() {
  const d = useDashboard();
  const { user } = useAuth();
  const { t } = useTranslation("dashboard");

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6 md:overflow-hidden">
          {d.initialLoading ? (
            <DashboardSkeleton />
          ) : d.error ? (
            <ErrorState onRetry={d.reload} />
          ) : d.activeHabits.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon={<Sparkles className="size-8" />}
              title={t("empty.title")}
              description={
                d.pillars.length === 0
                  ? t("empty.noPillarDescription")
                  : t("empty.description")
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {!user?.onboarded && (
                    <Link
                      to="/onboarding"
                      className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      {t("empty.setup")}
                    </Link>
                  )}
                  <Link
                    to={d.pillars.length === 0 ? "/settings/pillars" : "/settings/habits"}
                    className="inline-flex rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50"
                  >
                    {d.pillars.length === 0 ? t("empty.createPillar") : t("empty.createHabit")}
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="flex flex-col gap-6 md:min-h-0 md:flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm text-foreground/65">
                    {formatLongDate(new Date())}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {t(getGreetingKey())}, {user ? getDisplayName(user) : ""}
                  </h2>
                </div>
                <MonthNavigation
                  monthOffset={d.monthOffset}
                  label={formatMonthYear(d.targetDate)}
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
