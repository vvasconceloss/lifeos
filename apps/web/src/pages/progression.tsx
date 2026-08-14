import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, HelpCircle, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/i18n-format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProgressionResponse, PillarProgression } from "@lifeos/shared";

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"] as const;

const RANK_COLORS: Record<string, string> = {
  S: "text-amber-600 dark:text-amber-400",
  A: "text-emerald-600 dark:text-emerald-400",
  B: "text-sky-600 dark:text-sky-400",
  C: "text-violet-600 dark:text-violet-400",
  D: "text-primary",
  E: "text-foreground/50",
};

const RATE_KEYS = ["habits", "goals", "projects", "consistency"] as const;

function RankLetter({ rank, className }: { rank: string; className?: string }) {
  return (
    <span
      className={cn("font-bold leading-none", RANK_COLORS[rank] ?? RANK_COLORS.E, className)}
      aria-hidden
    >
      {rank}
    </span>
  );
}

function RankButton({ rank, sizeClass, onOpenRanks }: { rank: string; sizeClass: string; onOpenRanks: () => void }) {
  const { t } = useTranslation("progression");
  return (
    <button
      type="button"
      onClick={onOpenRanks}
      className="cursor-pointer transition-opacity hover:opacity-70"
      aria-label={t("ranks.seeHow", { rank })}
    >
      <RankLetter rank={rank} className={sizeClass} />
    </button>
  );
}

function ProgressBar({
  value,
  color,
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-border/60", className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          backgroundColor: color ?? "var(--chart-1)",
        }}
      />
    </div>
  );
}

function RanksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("progression");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("ranks.title")}</DialogTitle>
          <DialogDescription>{t("ranks.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {RANK_ORDER.map((rank) => (
            <div
              key={rank}
              className="flex items-center gap-3 rounded-lg border border-border/80 bg-accent/30 px-3 py-2"
            >
              <RankLetter rank={rank} className="text-xl" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t(`ranks.titles.${rank}`)}</p>
                <p className="text-xs text-foreground/60">{t(`ranks.descriptions.${rank}`)}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PillarPanel({
  pillar,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onOpenRanks,
}: {
  pillar: PillarProgression;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenRanks: () => void;
}) {
  const { t } = useTranslation("progression");
  const subBarColor = pillar.color ? `${pillar.color}66` : undefined;

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label={t("pillars.previous")}
          className="flex items-center justify-center rounded-md p-1 text-foreground/60 hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2 px-2">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: pillar.color ?? "#6b7280" }}
          />
          <h3 className="truncate text-base font-semibold text-foreground">{pillar.pillarName}</h3>
          <RankButton rank={pillar.rank} sizeClass="text-2xl" onOpenRanks={onOpenRanks} />
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label={t("pillars.next")}
          className="flex items-center justify-center rounded-md p-1 text-foreground/60 hover:text-foreground disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <ProgressBar
        className="h-2"
        value={pillar.xpToNext > 0 ? (pillar.xpIntoLevel / pillar.xpToNext) * 100 : 0}
        color={pillar.color ?? undefined}
      />
      <div className="mt-1 flex justify-between font-mono text-xs tabular-nums text-foreground/60">
        <span>
          {formatNumber(pillar.xp)} {t("xp")}
        </span>
        <span>
          {formatNumber(pillar.xpIntoLevel)} / {formatNumber(pillar.xpToNext)}
        </span>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-around border-t border-border/40 pt-3">
        {RATE_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-foreground/60">{t(`rates.${key}`)}</span>
            <ProgressBar className="h-2" value={pillar.rates[key]} color={subBarColor} />
            <span className="w-9 shrink-0 text-right font-mono tabular-nums text-foreground/80">
              {pillar.rates[key]}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PillarPagination({
  pillars,
  currentIndex,
  onSelect,
}: {
  pillars: PillarProgression[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useTranslation("progression");
  return (
    <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label={t("pillars.paginationLabel")}>
      {pillars.map((pillar, index) => (
        <button
          key={pillar.pillarId}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={t("pillars.goTo", { pillarName: pillar.pillarName })}
          aria-current={index === currentIndex ? "true" : undefined}
          className={cn(
            "size-2.5 rounded-full transition-colors",
            index === currentIndex ? "bg-primary" : "bg-border hover:bg-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

export default function ProgressionPage() {
  const { t } = useTranslation("progression");
  const [progression, setProgression] = useState<ProgressionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [ranksOpen, setRanksOpen] = useState(false);
  const [pillarIndex, setPillarIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(false);
      try {
        const res = await api.get<{ progression: ProgressionResponse }>("/progression");
        if (!cancelled) setProgression(res.data.progression);
      } catch (e) {
        if (!cancelled && !isUnauthorizedError(e)) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  const pillars = progression?.pillars ?? [];
  const safeIndex = Math.min(pillarIndex, Math.max(0, pillars.length - 1));
  const currentPillar = pillars[safeIndex];

  return (
    <ProtectedRoute>
      <AppLayout>
        <RanksDialog open={ranksOpen} onOpenChange={setRanksOpen} />

        <main className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h2>
            <p className="mt-1 text-sm text-foreground/60">{t("subtitle")}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-foreground/60">
              <Spinner className="size-5" />
            </div>
          ) : error ? (
            <ErrorState onRetry={retry} />
          ) : progression && !progression.enabled ? (
            <EmptyState
              icon={<Trophy className="size-8" />}
              title={t("emptyState.disabledTitle")}
              description={t("emptyState.disabledDescription")}
              action={
                <Link
                  to="/profile"
                  className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t("emptyState.enableAction")}
                </Link>
              }
            />
          ) : progression && progression.overall ? (
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <div className="rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm">
                <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-foreground/50">
                  {t("overall")}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <RankButton
                      rank={progression.overall.rank}
                      sizeClass="text-5xl"
                      onOpenRanks={() => setRanksOpen(true)}
                    />
                    <div className="mt-1.5 text-[10px] font-medium uppercase text-foreground/50">
                      {t("rank")}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <ProgressBar
                      className="h-2"
                      value={
                        progression.overall.xpToNext > 0
                          ? (progression.overall.xpIntoLevel / progression.overall.xpToNext) * 100
                          : 0
                      }
                    />
                    <div className="mt-1 flex justify-between font-mono text-xs tabular-nums text-foreground/60">
                      <span>
                        {formatNumber(progression.overall.xp)} {t("xp")}
                      </span>
                      <span>
                        {formatNumber(progression.overall.xpIntoLevel)} /{" "}
                        {formatNumber(progression.overall.xpToNext)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRanksOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground/50 transition-colors hover:text-foreground"
                >
                  <HelpCircle className="size-3.5" />
                  {t("ranks.title")}
                </button>
              </div>

              {pillars.length === 0 ? (
                <EmptyState
                  className="flex-1"
                  icon={<Trophy className="size-8" />}
                  title={t("emptyState.noPillarsTitle")}
                  description={t("emptyState.noPillarsDescription")}
                />
              ) : (
                <>
                  <PillarPanel
                    pillar={currentPillar}
                    canPrev={safeIndex > 0}
                    canNext={safeIndex < pillars.length - 1}
                    onPrev={() => setPillarIndex(safeIndex - 1)}
                    onNext={() => setPillarIndex(safeIndex + 1)}
                    onOpenRanks={() => setRanksOpen(true)}
                  />
                  <PillarPagination
                    pillars={pillars}
                    currentIndex={safeIndex}
                    onSelect={setPillarIndex}
                  />
                </>
              )}
            </div>
          ) : null}
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
