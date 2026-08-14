import { toast } from "sonner";
import { AxiosError } from "axios";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/auth-layout";
import { validateForm } from "@/lib/validation";
import { loginBodySchema } from "@lifeos/shared";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

interface FieldErrors {
  email?: string;
  password?: string;
}

const ERROR_KEYS: Record<string, string> = {
  "Email is required": "errors.emailRequired",
  "Invalid email address": "errors.emailInvalid",
  "Password is required": "errors.passwordRequired",
};

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const { user, loading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  async function handleSubmit(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setHasSubmitted(true);

    const fieldErrors = validateForm<FieldErrors>(loginBodySchema, {
      email: email.trim(),
      password,
    });

    setErrors(fieldErrors);

    if (fieldErrors.email || fieldErrors.password) {
      if (fieldErrors.email) fieldRefs.current.email?.focus();
      else fieldRefs.current.password?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const u = await login({ email: email.trim(), password });
      navigate({ to: u.onboarded ? "/app" : "/onboarding" });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        toast.error(t("login.invalidCredentials"));
      } else {
        toast.error(t("login.genericError"));
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

  const emailInputId = "email-input";
  const passwordInputId = "password-input";

  return (
    <AuthLayout>
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          {t("login.title")}
        </h1>
        <p className="mb-6 text-sm text-foreground/65">
          {t("login.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={emailInputId} className="block text-sm font-medium text-foreground">
              {t("login.email")}
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
                placeholder={t("login.emailPlaceholder")}
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
                {t(ERROR_KEYS[errors.email] ?? errors.email)}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor={passwordInputId} className="block text-sm font-medium text-foreground">
                {t("login.password")}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-foreground/60 underline underline-offset-4 hover:text-primary"
              >
                {t("login.forgotPassword")}
              </Link>
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
                placeholder={t("login.passwordPlaceholder")}
                className={inputClass("password")}
                autoComplete="current-password"
                aria-invalid={hasSubmitted && !!errors.password ? "true" : undefined}
                aria-describedby={hasSubmitted && errors.password ? errorId("password") : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
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
            {hasSubmitted && errors.password && (
              <p className="mt-1 text-xs text-destructive" id={errorId("password")} role="alert">
                {t(ERROR_KEYS[errors.password] ?? errors.password)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Spinner />}
            {submitting ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/65">
          {t("login.noAccount")}{" "}
          <Link
            to="/register"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            {t("login.createOne")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
