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
import {
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  BarChart3,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Link, useLocation } from "@tanstack/react-router";

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/settings/pillars", label: "Pillars", icon: Layers },
  { to: "/settings/habits", label: "Habits", icon: ListChecks },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/app" />} className="bg-transparent hover:bg-transparent">
              <img
                src={theme === "dark" ? "/lifeos-white-icon.png" : "/lifeos-black-icon.png"}
                alt="LifeOS logo"
                className="size-8 rounded-lg"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold uppercase">LifeOS</span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={pathname === item.to}
                    render={<Link to={item.to} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
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
            <SidebarMenuButton
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
