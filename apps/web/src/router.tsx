import RegisterPage from "./pages/register";
import { createRouter, RouterProvider, createRoute, createRootRoute } from "@tanstack/react-router";

const rootRoute = createRootRoute();

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const routeTree = rootRoute.addChildren([registerRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
