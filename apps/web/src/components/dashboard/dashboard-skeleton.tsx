import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="min-h-64 flex-1 rounded-2xl" />
    </div>
  );
}
