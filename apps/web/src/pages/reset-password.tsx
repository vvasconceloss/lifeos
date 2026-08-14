import { toast } from "sonner";
import { AxiosError } from "axios";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { api } from "@/lib/api";
import { validateForm } from "@/lib/validation";
import { resetPasswordBodySchema } from "@lifeos/shared";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";
import {
  PasswordRequirementsList,
  PasswordStrengthMeter,
} from "@/components/password-requirements";

type FieldErrors = { password?: string };

export default function ResetPasswordPage() {
  const { token } = useSearch({ from: "/reset-password" });
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reset, setReset] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    const fieldErrors = validateForm<FieldErrors>(resetPasswordBodySchema, { token, password });
    if (fieldErrors.password) {
      toast.error(fieldErrors.password);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setReset(true);
      navigate({ to: "/login", replace: true });
    } catch (error) {
      const code = (error as AxiosError<{ error?: { code?: string } }>).response?.data?.error?.code;
      if (code === "RESET_EXPIRED" || code === "INVALID_RESET_TOKEN") {
        toast.error("This reset link is invalid or has expired. Please request a new one.");
      } else {
        toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
            Invalid link
          </h1>
          <p className="mb-6 text-sm text-foreground/65">
            This reset link is missing or incomplete.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="mb-6 text-sm text-foreground/65">
          Choose a strong password for your LifeOS account.
        </p>

        {reset ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">Password reset</h2>
            <p className="text-sm text-foreground/70">
              Your password has been changed. Sign in with your new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-foreground">
                New password
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 pr-14 text-sm text-foreground placeholder:text-foreground/60 focus:border-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={password} />
              <PasswordRequirementsList password={password} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Spinner />}
              {submitting ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground/65">
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
