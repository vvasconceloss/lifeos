import { Spinner } from "@/components/ui/spinner";

export function RoutePending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-5" />
    </div>
  );
}
