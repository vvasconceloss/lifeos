import AppPage from "./pages/app";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import LandingPage from "./pages/landing";
import InsightsPage from "./pages/insights";
import StatisticsPage from "./pages/statistics";
import HabitDetailPage from "./pages/habit-detail";
import GoalsPage from "./pages/goals";
import GoalDetailPage from "./pages/goal-detail";
import ProjectsPage from "./pages/projects";
import ProjectDetailPage from "./pages/project-detail";
import JournalPage from "./pages/journal";
import ProfilePage from "./pages/profile";
import OnboardingPage from "./pages/onboarding";
import SettingsHabitsPage from "./pages/settings-habits";
import SettingsPillarsPage from "./pages/settings-pillars";
import { createRouter, RouterProvider, createRoute, createRootRoute } from "@tanstack/react-router";

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

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

const insightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/insights",
  component: InsightsPage,
});

const habitDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/habits/$id",
  component: HabitDetailPage,
});

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals",
  component: GoalsPage,
});

const goalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals/$id",
  component: GoalDetailPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$id",
  component: ProjectDetailPage,
});

const journalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/journal",
  component: JournalPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const routeTree = rootRoute.addChildren([indexRoute, registerRoute, loginRoute, onboardingRoute, appRoute, pillarsRoute, habitsRoute, statisticsRoute, insightsRoute, habitDetailRoute, goalsRoute, goalDetailRoute, projectsRoute, projectDetailRoute, journalRoute, profileRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
