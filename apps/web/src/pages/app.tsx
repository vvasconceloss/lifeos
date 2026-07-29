import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

export default function AppPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold text-foreground">LifeOS</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">
            Dashboard coming soon.
          </p>
        </main>
      </div>
    </ProtectedRoute>
  );
}
