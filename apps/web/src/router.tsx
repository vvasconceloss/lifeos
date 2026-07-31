import AppPage from "./pages/app";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import StatisticsPage from "./pages/statistics";
import SettingsHabitsPage from "./pages/settings-habits";
import SettingsPillarsPage from "./pages/settings-pillars";
import { createRouter, RouterProvider, createRoute, createRootRoute } from "@tanstack/react-router";

const rootRoute = createRootRoute();

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: AppPage,
});

const pillarsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/pillars",
  component: SettingsPillarsPage,
});

const habitsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/habits",
  component: SettingsHabitsPage,
});

const statisticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/statistics",
  component: StatisticsPage,
});

const routeTree = rootRoute.addChildren([registerRoute, loginRoute, appRoute, pillarsRoute, habitsRoute, statisticsRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
