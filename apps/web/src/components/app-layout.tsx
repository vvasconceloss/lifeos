import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
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
  "/journal": "Journal",
  "/settings/pillars": "Pillars",
  "/settings/habits": "Habits",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/goals/")) return "Goal";
  if (pathname.startsWith("/habits/")) return "Habit";
  return "LifeOS";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

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
        <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold text-foreground uppercase">{pageTitle}</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
