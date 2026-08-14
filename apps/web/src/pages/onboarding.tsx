import { toast } from "sonner";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ProtectedRoute } from "@/components/protected-route";
import { Spinner } from "@/components/ui/spinner";
import {
  ONBOARDING_HABITS,
  ONBOARDING_PILLARS,
} from "@/constants/onboarding";

const DEFAULT_HABITS_PER_PILLAR = 1;

function defaultSelectedHabits(pillarNames: string[]): Record<string, string[]> {
  return Object.fromEntries(
    pillarNames.map((name) => [
      name,
      (ONBOARDING_HABITS[name] ?? []).slice(0, DEFAULT_HABITS_PER_PILLAR).map((h) => h.name),
    ]),
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-border",
          )}
        />
      ))}
    </div>
  );
}

function OnboardingForm() {
  const { t } = useTranslation("onboarding");
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedPillars, setSelectedPillars] = useState<string[]>(
    ONBOARDING_PILLARS.map((p) => p.name),
  );
  const [selectedHabits, setSelectedHabits] = useState<Record<string, string[]>>(
    defaultSelectedHabits(ONBOARDING_PILLARS.map((p) => p.name)),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.onboarded) {
      navigate({ to: "/app", replace: true });
    }
  }, [user, navigate]);

  function togglePillar(name: string) {
    setSelectedPillars((prev) => {
      if (prev.includes(name)) return prev.filter((p) => p !== name);
      setSelectedHabits((h) => ({ ...h, ...defaultSelectedHabits([name]) }));
      return [...prev, name];
    });
  }

  function toggleHabit(pillar: string, habit: string) {
    setSelectedHabits((prev) => {
      const current = prev[pillar] ?? [];
      const next = current.includes(habit)
        ? current.filter((h) => h !== habit)
        : [...current, habit];
      return { ...prev, [pillar]: next };
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const pillars = selectedPillars.map((name) => {
        const opt = ONBOARDING_PILLARS.find((p) => p.name === name)!;
        return { name, color: opt.color, icon: opt.icon, description: opt.description };
      });
      const pillarIndexes = new Map(selectedPillars.map((name, idx) => [name, idx]));
      const habits = selectedPillars.flatMap((name) =>
        (selectedHabits[name] ?? []).map((habitName) => {
          const opt = (ONBOARDING_HABITS[name] ?? []).find((h) => h.name === habitName)!;
          return { name: habitName, pillarIndex: pillarIndexes.get(name)!, icon: opt.icon, color: opt.color };
        }),
      );

      await api.post("/auth/onboarding", { pillars, habits });
      await refreshUser();
      return true;
    } catch {
      toast.error(t("error"));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    const ok = await submit();
    if (ok) navigate({ to: "/app" });
  }

  async function handleStep1Continue() {
    if (selectedPillars.length === 0) {
      const ok = await submit();
      if (ok) navigate({ to: "/app" });
      return;
    }
    setStep(2);
  }

  async function handleStep2Finish() {
    const ok = await submit();
    if (ok) setStep(3);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <img
          src={theme === "dark" ? "/lifeos-white-icon.png" : "/lifeos-black-icon.png"}
          alt={t("logoAlt")}
          className="mb-10 max-h-10 w-auto"
        />
        <div className="w-full max-w-xl">
          {step === 1 && (
            <section>
              <div className="mb-10 flex items-center justify-between">
                <StepDots step={step} />
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="text-sm font-medium text-foreground/50 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {t("skip")}
                </button>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
              <p className="mt-1.5 text-sm text-foreground/60">
                {t("subtitle")}
              </p>

              <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {ONBOARDING_PILLARS.map((pillar) => {
                  const active = selectedPillars.includes(pillar.name);
                  return (
                    <button
                      key={pillar.name}
                      type="button"
                      onClick={() => togglePillar(pillar.name)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden>{pillar.icon}</span>
                        <span className="text-sm font-medium text-foreground">{pillar.name}</span>
                      </span>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-foreground/25",
                        )}
                      >
                        {active && <Check className="size-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  onClick={handleStep1Continue}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? <Spinner className="size-4" /> : <ArrowRight className="size-4" />}
                  {t("common:continue")}
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="mb-10 flex items-center justify-between">
                <StepDots step={step} />
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="text-sm font-medium text-foreground/50 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {t("skip")}
                </button>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">{t("habitsTitle")}</h1>
              <p className="mt-1.5 text-sm text-foreground/60">
                {t("habitsSubtitle")}
              </p>

              <div className="mt-8 space-y-9">
                {selectedPillars.map((pillarName) => (
                  <div key={pillarName}>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/60">
                      <span aria-hidden>{ONBOARDING_PILLARS.find((p) => p.name === pillarName)?.icon}</span>
                      {pillarName}
                    </h2>
                    <div className="space-y-3">
                      {(ONBOARDING_HABITS[pillarName] ?? []).map((habit) => {
                        const active = (selectedHabits[pillarName] ?? []).includes(habit.name);
                        return (
                          <button
                            key={habit.name}
                            type="button"
                            onClick={() => toggleHabit(pillarName, habit.name)}
                            aria-pressed={active}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
                              active
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-foreground/30",
                            )}
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-lg" aria-hidden>{habit.icon}</span>
                              <span className="text-sm font-medium text-foreground">{habit.name}</span>
                            </span>
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-foreground/25",
                              )}
                            >
                              {active && <Check className="size-3" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <ArrowLeft className="size-4" />
                  {t("common:back")}
                </button>
                <button
                  type="button"
                  onClick={handleStep2Finish}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? <Spinner className="size-4" /> : <Check className="size-4" />}
                  {t("finishSetup")}
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="text-center">
              <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="size-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{t("ready")}</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-foreground/60">
                {t("readyDescription")}
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/app" })}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("startUsing")}
                <ArrowRight className="size-4" />
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingForm />
    </ProtectedRoute>
  );
}
