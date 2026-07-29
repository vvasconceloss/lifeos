import { AxiosError } from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, type ChangeEvent } from "react";
import type { RegisterData } from "@/contexts/AuthContextBase";

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
}

function validate(data: RegisterData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Invalid email format";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
}

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

    const data: RegisterData = { email: email.trim(), password };
    if (name.trim()) data.name = name.trim();

    const fieldErrors = validate(data);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);

    try {
      await register(data);
      window.location.href = "/app";
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        setApiError("This email is already registered");
      } else if (
        error instanceof AxiosError &&
        error.response?.status === 400
      ) {
        const detail = error.response.data as { details?: Array<{ message: string }> };
        setApiError(
          detail.details?.[0]?.message ?? "Invalid input. Please check your data.",
        );
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
          Create your account
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Start tracking your habits and building a better you.
        </p>

        {apiError && (
          <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground"
            >
              Name{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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
              placeholder="At least 8 characters"
              className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="new-password"
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
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
