import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { useAnalytics } from "@/components/statistics/use-analytics";
import { InsightsSection } from "@/components/statistics/insights-section";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";

function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export default function InsightsPage() {
  const analytics = useAnalytics();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6">
          {analytics.loading && !analytics.analytics ? (
            <InsightsSkeleton />
          ) : analytics.error ? (
            <ErrorState onRetry={analytics.retry} />
          ) : analytics.analytics ? (
            <InsightsSection analytics={analytics.analytics} />
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
