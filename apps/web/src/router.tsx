import { lazy } from "react";
import { createRouter, RouterProvider, createRoute, createRootRoute } from "@tanstack/react-router";
import { RoutePending } from "@/components/route-pending";

const AppPage = lazy(() => import("./pages/app"));
const LandingPage = lazy(() => import("./pages/landing"));
const LoginPage = lazy(() => import("./pages/login"));
const RegisterPage = lazy(() => import("./pages/register"));
const InsightsPage = lazy(() => import("./pages/insights"));
const StatisticsPage = lazy(() => import("./pages/statistics"));
const HabitDetailPage = lazy(() => import("./pages/habit-detail"));
const GoalsPage = lazy(() => import("./pages/goals"));
const GoalDetailPage = lazy(() => import("./pages/goal-detail"));
const ProjectsPage = lazy(() => import("./pages/projects"));
const ProjectDetailPage = lazy(() => import("./pages/project-detail"));
const ProgressionPage = lazy(() => import("./pages/progression"));
const JournalPage = lazy(() => import("./pages/journal"));
const ProfilePage = lazy(() => import("./pages/profile"));
const OnboardingPage = lazy(() => import("./pages/onboarding"));
const SettingsHabitsPage = lazy(() => import("./pages/settings-habits"));
const SettingsPillarsPage = lazy(() => import("./pages/settings-pillars"));

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
  pendingComponent: RoutePending,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
  pendingComponent: RoutePending,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  pendingComponent: RoutePending,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: AppPage,
  pendingComponent: RoutePending,
});

const pillarsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/pillars",
  component: SettingsPillarsPage,
  pendingComponent: RoutePending,
});

const habitsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/habits",
  component: SettingsHabitsPage,
  pendingComponent: RoutePending,
});

const statisticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/statistics",
  component: StatisticsPage,
  pendingComponent: RoutePending,
});

const insightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/insights",
  component: InsightsPage,
  pendingComponent: RoutePending,
});

const habitDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/habits/$id",
  component: HabitDetailPage,
  pendingComponent: RoutePending,
});

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals",
  component: GoalsPage,
  pendingComponent: RoutePending,
});

const goalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals/$id",
  component: GoalDetailPage,
  pendingComponent: RoutePending,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
  pendingComponent: RoutePending,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$id",
  component: ProjectDetailPage,
  pendingComponent: RoutePending,
});

const progressionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progression",
  component: ProgressionPage,
  pendingComponent: RoutePending,
});

const journalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/journal",
  component: JournalPage,
  pendingComponent: RoutePending,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
  pendingComponent: RoutePending,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
  pendingComponent: RoutePending,
});

const routeTree = rootRoute.addChildren([indexRoute, registerRoute, loginRoute, onboardingRoute, appRoute, pillarsRoute, habitsRoute, statisticsRoute, insightsRoute, habitDetailRoute, goalsRoute, goalDetailRoute, projectsRoute, projectDetailRoute, progressionRoute, journalRoute, profileRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
