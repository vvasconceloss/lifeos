import { toast } from "sonner";
import { AxiosError } from "axios";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Eye, EyeOff, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/auth-layout";
import { getApiErrorMessage } from "@/lib/errors";
import { registerBodySchema } from "@lifeos/shared";
import { validateForm } from "@/lib/validation";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PasswordStrengthMeter,
  PasswordRequirementsList,
} from "@/components/password-requirements";
import { useEffect, useRef, useState, type FormEvent } from "react";

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
}

export default function RegisterPage() {
  const { user, loading, register, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (user.isDemo) {
      // The demo session must never block the real login/register pages.
      void logout();
      return;
    }
    if (user.status === "PENDING_DELETION") {
      navigate({ to: "/account/recovery", replace: true });
      return;
    }
    navigate({ to: user.onboarded ? "/app" : "/onboarding" });
  }, [user, loading, logout, navigate]);

  function clearFieldError(field: keyof FieldErrors) {
    if (hasSubmitted && errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function errorId(field: string) { return `${field}-error`; }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHasSubmitted(true);

    const payload: Record<string, string> = { email: email.trim(), password };
    if (name.trim()) payload.name = name.trim();

    const fieldErrors = validateForm<FieldErrors>(registerBodySchema, payload);

    setErrors(fieldErrors);

    if (fieldErrors.email || fieldErrors.password || fieldErrors.name) {
      if (fieldErrors.name) fieldRefs.current.name?.focus();
      else if (fieldErrors.email) fieldRefs.current.email?.focus();
      else fieldRefs.current.password?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const u = await register({
        email: email.trim(),
        password,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      navigate({ to: u.onboarded ? "/app" : "/onboarding" });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        toast.error("This email is already registered");
      } else if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error(getApiErrorMessage(error, "Invalid input. Please check your data."));
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function inputClass(field: keyof FieldErrors) {
    const hasError = hasSubmitted && errors[field];
    const isPassword = field === "password";
    return [
      "mt-1 block w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2",
      hasError
        ? "border-destructive focus:border-destructive focus:ring-destructive/30"
        : "border-input focus:border-foreground/70 focus:ring-foreground/10",
      isPassword ? "pr-14" : "pr-10",
    ].join(" ");
  }

  const nameInputId = "name-input";
  const emailInputId = "email-input";
  const passwordInputId = "password-input";

  return (
    <AuthLayout>
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={nameInputId} className="block text-sm font-medium text-foreground">
              Name{" "}
              <span className="text-foreground/60">(optional)</span>
            </label>
            <input
              id={nameInputId}
              type="text"
              value={name}
              ref={(el) => { fieldRefs.current.name = el; }}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              placeholder="Your name"
              className={inputClass("name")}
              aria-invalid={hasSubmitted && !!errors.name ? "true" : undefined}
              aria-describedby={hasSubmitted && errors.name ? errorId("name") : undefined}
            />
            {hasSubmitted && errors.name && (
              <p className="mt-1 text-xs text-destructive" id={errorId("name")} role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={emailInputId} className="block text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <input
                id={emailInputId}
                type="email"
                value={email}
                ref={(el) => { fieldRefs.current.email = el; }}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                placeholder="you@example.com"
                className={inputClass("email")}
                autoComplete="email"
                aria-invalid={hasSubmitted && !!errors.email ? "true" : undefined}
                aria-describedby={hasSubmitted && errors.email ? errorId("email") : undefined}
              />
              {hasSubmitted && errors.email && (
                <AlertTriangle
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-destructive"
                  aria-hidden
                />
              )}
            </div>
            {hasSubmitted && errors.email && (
              <p className="mt-1 text-xs text-destructive" id={errorId("email")} role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-x-1">
              <label htmlFor={passwordInputId} className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Password requirements"
                    >
                      <Info className="size-4" />
                    </button>
                  }
                />
                <TooltipContent side="left" align="center" className="w-64">
                  <PasswordRequirementsList password={password} email={email} />
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <input
                id={passwordInputId}
                type={showPassword ? "text" : "password"}
                value={password}
                ref={(el) => { fieldRefs.current.password = el; }}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                placeholder="At least 8 characters"
                className={inputClass("password")}
                autoComplete="new-password"
                aria-invalid={hasSubmitted && !!errors.password ? "true" : undefined}
                aria-describedby={hasSubmitted && errors.password ? errorId("password") : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              {hasSubmitted && errors.password && (
                <AlertTriangle
                  className="pointer-events-none absolute right-10 top-1/2 size-4 -translate-y-1/2 text-destructive"
                  aria-hidden
                />
              )}
            </div>
            <PasswordStrengthMeter password={password} email={email} />
            {hasSubmitted && errors.password && (
              <p className="mt-1 text-xs text-destructive" id={errorId("password")} role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Spinner />}
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/65">
          Already have an account?{" "}
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
