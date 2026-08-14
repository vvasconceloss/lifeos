import {
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  BarChart3,
  Sparkles,
  Target,
  NotebookPen,
  User,
  FolderKanban,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { UserAvatar } from "@/components/user-avatar";
import { Link, useLocation } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { to: "/app", labelKey: "common:dashboard", icon: LayoutDashboard },
  { to: "/insights", labelKey: "common:insights", icon: Sparkles },
  { to: "/statistics", labelKey: "common:statistics", icon: BarChart3 },
  { to: "/goals", labelKey: "common:goals", icon: Target },
  { to: "/projects", labelKey: "common:projects", icon: FolderKanban },
  { to: "/progression", labelKey: "common:progression", icon: Trophy },
  { to: "/journal", labelKey: "common:journal", icon: NotebookPen },
  { to: "/settings/pillars", labelKey: "common:pillars", icon: Layers },
  { to: "/settings/habits", labelKey: "common:habits", icon: ListChecks },
];

// Unverified users are restricted to pillars and habits (setup). The rest of the
// app unlocks once the email is confirmed.
const PREMIUM_ROUTES = new Set(["/insights", "/statistics", "/goals", "/projects", "/progression", "/journal"]);

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const { t } = useTranslation("dashboard");

  const verified = user?.emailVerified || user?.isDemo;

  const navItems = NAV_ITEMS.filter(
    (item) =>
      (item.to !== "/progression" || user?.gamification) &&
      (verified || !PREMIUM_ROUTES.has(item.to)),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/app" />} className="bg-transparent hover:bg-transparent">
              <img
                src={theme === "dark" ? "/lifeos-white-icon.png" : "/lifeos-black-icon.png"}
                alt={t("logoAlt")}
                className="size-8 rounded-lg"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold uppercase">LifeOS</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={pathname === item.to}
                    render={<Link to={item.to} />}
                  >
                    <item.icon />
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="flex h-8 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                    aria-label={t("openProfileMenu")}
                  >
                    <UserAvatar email={user?.email ?? ""} className="size-6" />
                    <span className="min-w-0 flex-1 truncate text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
                      {user?.email}
                    </span>
                  </button>
                }
              />
              <PopoverContent className="w-52 p-1" side="top" align="start">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent"
                >
                  <User className="size-4" />
                  {t("common:profile")}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent"
                >
                  <LogOut className="size-4" />
                  {t("common:logout")}
                </button>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
