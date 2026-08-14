import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    try {
      // The API always returns the same generic message (anti-enumeration).
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("forgotPassword.genericError")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          {t("forgotPassword.title")}
        </h1>
        <p className="mb-6 text-sm text-foreground/65">
          {t("forgotPassword.subtitle")}
        </p>

        {sent ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <MailCheck className="size-10 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("forgotPassword.checkInbox")}</h2>
            <p className="text-sm text-foreground/70">
              {t("forgotPassword.checkInboxSubtitle")}
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("forgotPassword.backToSignIn")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground">
                {t("forgotPassword.email")}
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("forgotPassword.emailPlaceholder")}
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:border-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Spinner />}
              {submitting ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground/65">
          {t("forgotPassword.rememberedIt")}{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            {t("forgotPassword.signIn")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
