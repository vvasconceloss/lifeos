import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { FeedbackMenu } from "@/components/feedback-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/insights": "Insights",
  "/statistics": "Statistics",
  "/goals": "Goals",
  "/projects": "Projects",
  "/progression": "Progression",
  "/journal": "Journal",
  "/profile": "Profile",
  "/settings/pillars": "Pillars",
  "/settings/habits": "Habits",
};

// Routes that require a verified email (everything except pillars/habits setup).
const PREMIUM_PREFIXES = ["/insights", "/statistics", "/goals", "/projects", "/progression", "/journal"];

function isPremiumPath(pathname: string): boolean {
  return PREMIUM_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/goals/")) return "Goal";
  if (pathname.startsWith("/projects/")) return "Project";
  if (pathname.startsWith("/habits/")) return "Habit";
  return "LifeOS";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    if (!loading && user && !user.onboarded && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [user, loading, pathname, navigate]);

  // Unverified users are restricted to pillars/habits until they confirm the email.
  useEffect(() => {
    if (!loading && user && !user.emailVerified && !user.isDemo && isPremiumPath(pathname)) {
      navigate({ to: "/app", replace: true });
    }
  }, [user, loading, pathname, navigate]);

  return (
    <SidebarProvider defaultOpen={false} className="h-svh max-h-svh overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset id="main-content" className="flex h-full max-h-full flex-1 flex-col overflow-hidden">
        {user && !user.emailVerified && !user.isDemo ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2.5">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Please verify your email to fully activate your account.
            </p>
            <Link
              to="/verify-email"
              search={{ token: undefined, redirect: pathname }}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium underline underline-offset-4",
                "text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300",
              )}
            >
              Verify now
            </Link>
          </div>
        ) : null}
        <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold text-foreground uppercase">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-1">
            <FeedbackMenu />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
