import type { ReactNode } from "react";
import { useState } from "react";
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
    title: "Pillars",
    description:
      "Organize your life into areas that matter — Health, Engineering, Relationships, and anything else you define.",
  },
  {
    icon: CalendarCheck2,
    title: "Flexible habits",
    description:
      "Track habits daily, on specific weekdays, or a target number of times per week or month.",
  },
  {
    icon: BarChart3,
    title: "Progress & streaks",
    description:
      "See completion rates, current and best streaks, and how your consistency evolves over time.",
  },
  {
    icon: Target,
    title: "Goals",
    description:
      "Set goals, link supporting habits to them, and watch progress update as you complete your routines.",
  },
  {
    icon: Sparkles,
    title: "Insights",
    description:
      "Understand which pillar needs focus this week and how consistent your daily effort really is.",
  },
  {
    icon: NotebookPen,
    title: "Journal",
    description:
      "Log mood, energy and sleep, and review your monthly state alongside your habit data.",
  },
];

const STEPS = [
  {
    title: "Define your pillars",
    description:
      "Start from the areas of your life you care about — or create your own from scratch.",
  },
  {
    title: "Add realistic habits",
    description:
      "Choose a frequency that fits your life, not an impossible daily streak.",
  },
  {
    title: "Track in seconds",
    description:
      "Mark a completion with one tap. That's it — the rest is calculated for you.",
  },
  {
    title: "Review and adjust",
    description:
      "Use streaks, rates and insights to see what works and course-correct.",
  },
];

const STATS = [
  {
    value: "4+",
    label: "trackable habit frequencies",
    description:
      "Daily, specific weekdays, or a target number of times per week or month — pick what actually fits your life.",
  },
  {
    value: "6",
    label: "predefined life pillars",
    description:
      "Health, Engineering, Relationships and more — or create your own areas from scratch.",
  },
  {
    value: "1",
    label: "tap to log a completion",
    description:
      "One tap to mark a habit done. Everything else — streaks, rates and insights — is calculated for you.",
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
  const { theme } = useTheme();
  return (
    <img
      src={theme === "dark" ? "/lifeos-white-icon.png" : "/lifeos-black-icon.png"}
      alt="LifeOS logo"
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
      {loading ? "Loading demo…" : "View Demo"}
    </Button>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-8 rounded-lg" />
            <span className="text-base font-semibold tracking-tight">LifeOS</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-foreground/70 md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#technology" className="transition-colors hover:text-foreground">
              Technology
            </a>
            <a href="#project" className="transition-colors hover:text-foreground">
              Project
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link to="/login" />}>
              Log in
            </Button>
            <Button size="sm" render={<Link to="/register" />}>
              Get Started
            </Button>
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
              Track habits · Build goals · Understand yourself
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="mt-8 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl"
            >
              Build a life you can measure,
              <br className="hidden sm:block" /> understand, and improve.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-xl text-lg text-foreground/60"
            >
              LifeOS is a personal system for turning the life you want into habits you can
              actually keep — then showing you what is working.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <Button size="lg" render={<Link to="/register" />}>
                Get Started
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Button>
              <DemoButton size="lg" />
            </motion.div>
          </motion.div>
        </section>

        <section className="border-y border-border/80 bg-muted/40">
          <StaggerGroup className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-24 sm:grid-cols-3">
            {STATS.map((stat) => (
              <StaggerItem key={stat.label}>
                <div className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
                  <div className="text-4xl font-semibold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground">{stat.label}</div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/60">
                    {stat.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section id="problem" className="mx-auto w-full max-w-6xl px-6 py-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <SectionHeading eyebrow="The problem" title="Another to-do list isn't the answer" />
              <StaggerGroup className="-mt-10 space-y-5">
                {[
                  "Lists tell you what to do, but nothing about whether you're improving.",
                  "All-or-nothing streaks make one missed day feel like failure.",
                  "A rigid daily schedule collapses the moment life gets busy.",
                ].map((point) => (
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
                <p className="text-sm font-medium text-foreground/60">A to-do list tells you:</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">"Do this task."</p>
                <div className="my-8 border-t border-border/40" />
                <p className="text-sm font-medium text-foreground/60">LifeOS tells you:</p>
                <ul className="mt-3 space-y-3">
                  {[
                    "How consistent you actually are",
                    "Whether your habits match a realistic frequency",
                    "Which pillar deserves your attention this week",
                  ].map((line) => (
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
              eyebrow="How LifeOS works"
              title="From scattered notes to a system that compounds"
            />
            <StaggerGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <StaggerItem key={step.title}>
                  <Card className="h-full">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-base font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm text-foreground/60">{step.description}</p>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 py-28">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to run your life as a system"
            description="Designed for depth without ceremony — each feature answers a concrete question about your progress."
          />
          <StaggerGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.title}>
                <Card className="h-full">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-foreground/60">{feature.description}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section id="screenshots" className="border-y border-border/80 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-28">
            <SectionHeading
              eyebrow="Screenshots"
              title="A quiet, focused workspace"
              description="The same interface you'll use every day — clear in both light and dark mode."
            />
            <StaggerGroup className="grid items-start gap-8 lg:grid-cols-2">
              <StaggerItem className="lg:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
                    <span className="text-sm font-semibold text-foreground">Dashboard</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Live demo
                    </span>
                  </div>
                  <img
                    src="/screenshots/dashboard.png"
                    alt="LifeOS dashboard with the monthly habit grid"
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
            eyebrow="Technology"
            title="Modern, boring, dependable"
            description="A focused full-stack foundation that stays out of the way."
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
              eyebrow="Open source"
              title="A personal project, built in the open"
              description="LifeOS started as a way for one person to systematically improve their life — and the code is available for anyone to learn from or build on."
            />
            <Reveal className="mx-auto max-w-2xl">
              <Card className="p-8 text-center">
                <p className="text-sm text-foreground/60">
                  The philosophy is simple: track what you do, understand what works, and improve
                  one thing at a time. No aggressive marketing, no gamified streaks — just a
                  clearer picture of your own life.
                </p>
              </Card>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-28 text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Start with one habit today.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-foreground/60">
              Create a free account, define your pillars, and let LifeOS show you the progress
              you're making.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" render={<Link to="/register" />}>
                Get Started
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Button>
              <DemoButton size="lg" />
              <Button variant="ghost" size="lg" render={<Link to="/login" />}>
                Log in
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="size-6 rounded-md" />
            <span className="text-sm font-semibold tracking-tight">LifeOS</span>
          </div>
          <p className="text-xs text-foreground/50">
            © {new Date().getFullYear()} LifeOS — build a life you can measure.
          </p>
        </div>
      </footer>
    </div>
  );
}
