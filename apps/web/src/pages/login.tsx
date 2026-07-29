import { AxiosError } from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, type ChangeEvent } from "react";

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email) {
    errors.email = "Email is required";
  }

  if (!password) {
    errors.password = "Password is required";
  }

  return errors;
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/app";
    }
  }, [user, loading]);

  async function handleSubmit(e: ChangeEvent) {
    e.preventDefault();
    setApiError(null);

    const fieldErrors = validate(email.trim(), password);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      window.location.href = "/app";
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        setApiError("Invalid email or password");
      } else {
        setApiError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign in to continue tracking your habits.
        </p>

        {apiError && (
          <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
