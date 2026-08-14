import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation("statistics");
  const resolvedTitle = title ?? t("errorState.title");
  const resolvedDescription = description ?? t("errorState.description");

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <AlertTriangle className="mb-3 size-8 text-destructive/70" aria-hidden />
      <h3 className="text-base font-semibold text-foreground">{resolvedTitle}</h3>
      <p className="mt-1 max-w-sm text-sm text-foreground/60">{resolvedDescription}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-4">
          <RefreshCw className="mr-2 size-4" aria-hidden />
          {t("errorState.retry")}
        </Button>
      )}
    </div>
  );
}
