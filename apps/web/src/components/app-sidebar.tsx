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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings/pillars", label: "Pillars", icon: Layers },
  { to: "/settings/habits", label: "Habits", icon: ListChecks },
];

export function AppSidebar() {
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/app" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
                L
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-semibold">LifeOS</span>
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
                  <SidebarMenuButton render={<Link to={item.to} />}>
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
