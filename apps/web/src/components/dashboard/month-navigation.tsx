import { ChevronLeft, ChevronRight } from "lucide-react";

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
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <button onClick={onPrev} className="flex items-center justify-center rounded-md p-1 text-foreground/50 hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        {monthOffset !== 0 && (
          <button onClick={onToday} className="rounded-md px-2 py-1 text-xs font-medium text-foreground/60 hover:text-foreground">
            Today
          </button>
        )}
      </div>
      <span className="flex items-center text-sm font-semibold text-foreground">
        {label}
      </span>
      <button onClick={onNext} className="flex items-center justify-center rounded-md p-1 text-foreground/50 hover:text-foreground">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
