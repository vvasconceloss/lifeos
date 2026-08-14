import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MonthNavigation({
  monthOffset,
  label,
  onPrev,
  onNext,
  onToday,
}: {
  monthOffset: number;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const { t } = useTranslation("dashboard");

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onPrev} aria-label={t("monthNav.previousMonth")} className="flex items-center justify-center rounded-md p-1 text-foreground/60 hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        {monthOffset !== 0 && (
          <button type="button" onClick={onToday} className="rounded-md px-2 py-1 text-xs font-medium text-foreground/60 hover:text-foreground">
            {t("monthNav.today")}
          </button>
        )}
      </div>
      <span className="flex items-center text-sm font-semibold text-foreground">
        {label}
      </span>
      <button type="button" onClick={onNext} aria-label={t("monthNav.nextMonth")} className="flex items-center justify-center rounded-md p-1 text-foreground/60 hover:text-foreground">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
