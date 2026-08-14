import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  Layers,
  NotebookPen,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { LocaleSwitcher } from "@/components/locale-switcher";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const FEATURES = [
  {
    icon: Layers,
    titleKey: "features.items.0.title",
    descriptionKey: "features.items.0.description",
  },
  {
    icon: CalendarCheck2,
    titleKey: "features.items.1.title",
    descriptionKey: "features.items.1.description",
  },
  {
    icon: BarChart3,
    titleKey: "features.items.2.title",
    descriptionKey: "features.items.2.description",
  },
  {
    icon: Target,
    titleKey: "features.items.3.title",
    descriptionKey: "features.items.3.description",
  },
  {
    icon: Sparkles,
    titleKey: "features.items.4.title",
    descriptionKey: "features.items.4.description",
  },
  {
    icon: NotebookPen,
    titleKey: "features.items.5.title",
    descriptionKey: "features.items.5.description",
  },
];

const STEPS = [
  {
    titleKey: "howItWorks.steps.0.title",
    descriptionKey: "howItWorks.steps.0.description",
  },
  {
    titleKey: "howItWorks.steps.1.title",
    descriptionKey: "howItWorks.steps.1.description",
  },
  {
    titleKey: "howItWorks.steps.2.title",
    descriptionKey: "howItWorks.steps.2.description",
  },
  {
    titleKey: "howItWorks.steps.3.title",
    descriptionKey: "howItWorks.steps.3.description",
  },
];

const STATS = [
  {
    value: "4+",
    labelKey: "stats.frequencies.label",
    descriptionKey: "stats.frequencies.description",
  },
  {
    value: "6",
    labelKey: "stats.pillars.label",
    descriptionKey: "stats.pillars.description",
  },
  {
    value: "1",
    labelKey: "stats.tap.label",
    descriptionKey: "stats.tap.description",
  },
];

const TECH = [
  "TypeScript",
  "React",
  "Fastify",
  "Prisma",
  "PostgreSQL",
  "TanStack Router",
  "Tailwind CSS",
  "Zod",
];

function Logo({ className }: { className?: string }) {
  const { t } = useTranslation("landing");
  const { theme } = useTheme();
  return (
    <img
      src={theme === "dark" ? "/lifeos-white-icon.png" : "/lifeos-black-icon.png"}
      alt={t("logoAlt")}
      className={className ?? "size-8 rounded-lg"}
    />
  );
}

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      {...(reduceMotion ? { initial: false, whileInView: undefined } : {})}
    >
      {children}
    </motion.div>
  );
}

function StaggerGroup({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="mx-auto mb-16 max-w-2xl text-center">
      <span className="text-xs font-semibold uppercase tracking-widest text-foreground/60">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-xl text-base text-foreground/60">{description}</p>
      )}
    </Reveal>
  );
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`rounded-2xl border border-border/80 bg-card p-6 shadow-sm ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

function DemoButton({ size = "lg" }: { size?: "lg" | "default" }) {
  const { t } = useTranslation("landing");
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleDemo() {
    setLoading(true);
    try {
      await demoLogin();
      navigate({ to: "/app" });
    } catch {
      navigate({ to: "/login" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size={size} onClick={handleDemo} disabled={loading}>
      <Play className="mr-1 size-4" aria-hidden />
      {loading ? t("demoLoading") : t("viewDemo")}
    </Button>
  );
}

export default function LandingPage() {
  const { t } = useTranslation("landing");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-8 rounded-lg" />
            <span className="text-base font-semibold tracking-tight">{t("common:appName")}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-foreground/70 md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              {t("nav.features")}
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              {t("nav.howItWorks")}
            </a>
            <a href="#technology" className="transition-colors hover:text-foreground">
              {t("nav.technology")}
            </a>
            <a href="#project" className="transition-colors hover:text-foreground">
              {t("nav.project")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link to="/login" />}>
              {t("login")}
            </Button>
            <Button size="sm" render={<Link to="/register" />}>
              {t("getStarted")}
            </Button>
            <div className="ml-1 border-l border-border/80 pl-3">
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-6xl min-h-[calc(100svh-4rem)] items-center px-6 py-24">
          <motion.div
            className="mx-auto w-full max-w-3xl text-center"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              <Sparkles className="size-3.5" aria-hidden />
              {t("heroBadge")}
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="mt-8 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl"
            >
              {t("heroTitle1")}
              <br className="hidden sm:block" /> {t("heroTitle2")}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-xl text-lg text-foreground/60"
            >
              {t("heroDescription")}
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <Button size="lg" render={<Link to="/register" />}>
                {t("getStarted")}
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Button>
              <DemoButton size="lg" />
            </motion.div>
          </motion.div>
        </section>

        <section className="border-y border-border/80 bg-muted/40">
          <StaggerGroup className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-24 sm:grid-cols-3">
            {STATS.map((stat) => (
              <StaggerItem key={stat.labelKey}>
                <div className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
                  <div className="text-4xl font-semibold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground">{t(stat.labelKey)}</div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/60">
                    {t(stat.descriptionKey)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section id="problem" className="mx-auto w-full max-w-6xl px-6 py-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <SectionHeading eyebrow={t("problem.eyebrow")} title={t("problem.title")} />
              <StaggerGroup className="-mt-10 space-y-5">
                {(t("problem.points", { returnObjects: true }) as string[]).map((point) => (
                  <StaggerItem key={point}>
                    <div className="flex items-start gap-3 text-foreground/70">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <span aria-hidden className="text-xs font-bold">×</span>
                      </span>
                      {point}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
            <Reveal>
              <Card className="p-8">
                <p className="text-sm font-medium text-foreground/60">{t("problem.toDoListTells")}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{t("problem.toDoListQuote")}</p>
                <div className="my-8 border-t border-border/40" />
                <p className="text-sm font-medium text-foreground/60">{t("problem.lifeOSTells")}</p>
                <ul className="mt-3 space-y-3">
                  {(t("problem.lifeOSTellPoints", { returnObjects: true }) as string[]).map((line) => (
                    <li key={line} className="flex items-start gap-2 text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border/80 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-28">
            <SectionHeading
              eyebrow={t("howItWorks.eyebrow")}
              title={t("howItWorks.title")}
            />
            <StaggerGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <StaggerItem key={step.titleKey}>
                  <Card className="h-full">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-base font-semibold text-foreground">{t(step.titleKey)}</h3>
                    <p className="mt-2 text-sm text-foreground/60">{t(step.descriptionKey)}</p>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 py-28">
          <SectionHeading
            eyebrow={t("features.eyebrow")}
            title={t("features.title")}
            description={t("features.description")}
          />
          <StaggerGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.titleKey}>
                <Card className="h-full">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-foreground">{t(feature.titleKey)}</h3>
                  <p className="mt-2 text-sm text-foreground/60">{t(feature.descriptionKey)}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section id="screenshots" className="border-y border-border/80 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-28">
            <SectionHeading
              eyebrow={t("screenshots.eyebrow")}
              title={t("screenshots.title")}
              description={t("screenshots.description")}
            />
            <StaggerGroup className="grid items-start gap-8 lg:grid-cols-2">
              <StaggerItem className="lg:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
                    <span className="text-sm font-semibold text-foreground">{t("screenshots.dashboard")}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {t("screenshots.liveDemo")}
                    </span>
                  </div>
                  <img
                    src="/screenshots/dashboard.png"
                    alt={t("screenshots.imageAlt")}
                    loading="lazy"
                    className="block h-auto w-full"
                  />
                </div>
              </StaggerItem>
            </StaggerGroup>
          </div>
        </section>

        <section id="technology" className="mx-auto w-full max-w-6xl px-6 py-28">
          <SectionHeading
            eyebrow={t("technology.eyebrow")}
            title={t("technology.title")}
            description={t("technology.description")}
          />
          <StaggerGroup className="flex flex-wrap justify-center gap-3">
            {TECH.map((tech) => (
              <StaggerItem key={tech}>
                <span className="inline-block rounded-full border border-border bg-card px-5 py-2 text-sm text-foreground/70">
                  {tech}
                </span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section id="project" className="border-y border-border/80 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-28">
            <SectionHeading
              eyebrow={t("project.eyebrow")}
              title={t("project.title")}
              description={t("project.description")}
            />
            <Reveal className="mx-auto max-w-2xl">
              <Card className="p-8 text-center">
                <p className="text-sm text-foreground/60">
                  {t("project.philosophy")}
                </p>
              </Card>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-28 text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-foreground/60">
              {t("cta.description")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" render={<Link to="/register" />}>
                {t("getStarted")}
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Button>
              <DemoButton size="lg" />
              <Button variant="ghost" size="lg" render={<Link to="/login" />}>
                {t("login")}
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="size-6 rounded-md" />
            <span className="text-sm font-semibold tracking-tight">{t("common:appName")}</span>
          </div>
          <p className="text-xs text-foreground/50">
            {t("footer", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
