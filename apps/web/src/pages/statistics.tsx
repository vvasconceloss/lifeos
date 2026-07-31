import { AppLayout } from "@/components/app-layout";
import { MonthNavigation } from "@/components/dashboard/month-navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { HabitStatsTable } from "@/components/statistics/habit-stats-table";
import { HeatmapCard } from "@/components/statistics/heatmap-card";
import { PillarStats } from "@/components/statistics/pillar-stats";
import { SummaryCards } from "@/components/statistics/summary-cards";
import { TopHabits } from "@/components/statistics/top-habits";
import { useStatistics } from "@/components/statistics/use-statistics";

function Spinner() {
  return <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}

export default function StatisticsPage() {
  const s = useStatistics();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full flex-1 flex-col overflow-hidden px-6 py-6">
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto scroll-subtle">
            <MonthNavigation
              monthOffset={s.monthOffset}
              label={s.targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              onPrev={() => s.setMonthOffset(s.monthOffset - 1)}
              onNext={() => s.setMonthOffset(s.monthOffset + 1)}
              onToday={() => s.setMonthOffset(0)}
            />
            {s.loading && !s.overview ? (
              <div className="flex flex-1 items-center justify-center"><Spinner /></div>
            ) : s.overview ? (
              <>
                <SummaryCards overview={s.overview} />
                <div className="grid gap-6 lg:grid-cols-2">
                  <PillarStats
                    pillars={s.overview.pillarStats}
                    monthLabel={s.targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  />
                  <TopHabits habits={s.overview.habitStats} year={s.overview.year} month={s.overview.month} />
                </div>
                <HabitStatsTable habits={s.overview.habitStats} year={s.overview.year} month={s.overview.month} />
                <HeatmapCard year={s.overview.year} />
              </>
            ) : null}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
