import { toast } from "sonner";
import { AxiosError } from "axios";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
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

const ERROR_KEYS: Record<string, string> = {
  "Password is required": "errors.passwordRequired",
  "Password must be at least 8 characters": "errors.passwordMin",
  "Password must include at least one lowercase letter": "errors.passwordLowercase",
  "Password must include at least one uppercase letter": "errors.passwordUppercase",
  "Password must include at least one number": "errors.passwordNumber",
  "Password must include at least one special character": "errors.passwordSpecial",
  "Password is too common. Choose a more unique password.": "errors.passwordCommon",
  "Password must be at most 72 bytes": "errors.passwordMaxBytes",
};

export default function ResetPasswordPage() {
  const { t } = useTranslation("auth");
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
      toast.error(t(ERROR_KEYS[fieldErrors.password] ?? fieldErrors.password));
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
        toast.error(t("resetPassword.invalidOrExpired"));
      } else {
        toast.error(getApiErrorMessage(error, t("resetPassword.genericError")));
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
            {t("resetPassword.invalidLink")}
          </h1>
          <p className="mb-6 text-sm text-foreground/65">
            {t("resetPassword.missingLink")}
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("resetPassword.requestNewLink")}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          {t("resetPassword.title")}
        </h1>
        <p className="mb-6 text-sm text-foreground/65">
          {t("resetPassword.subtitle")}
        </p>

        {reset ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">{t("resetPassword.resetHeading")}</h2>
            <p className="text-sm text-foreground/70">
              {t("resetPassword.resetSubtitle")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-foreground">
                {t("resetPassword.newPassword")}
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("resetPassword.passwordPlaceholder")}
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 pr-14 text-sm text-foreground placeholder:text-foreground/60 focus:border-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                  aria-label={showPassword ? t("resetPassword.hidePassword") : t("resetPassword.showPassword")}
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
              {submitting ? t("resetPassword.resetting") : t("resetPassword.resetButton")}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground/65">
          {t("resetPassword.rememberedIt")}{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            {t("resetPassword.signIn")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
