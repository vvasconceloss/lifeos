import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleX, MailCheck, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";

type VerifyState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "expired" }
  | { status: "error"; message: string }
  | { status: "no-token" };

const RESEND_COOLDOWN_SECONDS = 60;

function isSafeRedirect(value: string | undefined): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login");
}

export default function VerifyEmailPage() {
  const { t } = useTranslation("auth");
  const { token, redirect } = useSearch({ from: "/verify-email" });
  const navigate = useNavigate();
  const { user, loading, refreshUser, resendVerification } = useAuth();
  const [state, setState] = useState<VerifyState>(token ? { status: "loading" } : { status: "no-token" });
  const [email, setEmail] = useState(user?.email ?? "");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<number | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  // An already-verified user has no business on this page — send them back.
  useEffect(() => {
    if (!loading && user && user.emailVerified && !user.isDemo) {
      navigate({ to: redirect && isSafeRedirect(redirect) ? redirect : "/app", replace: true });
    }
  }, [user, loading, navigate, redirect]);

  useEffect(() => {
    if (!token) return;

    // Guard against React StrictMode double-invoking the effect in development:
    // a single-use token must only be consumed once.
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    api
      .post<{ emailVerified: boolean }>("/auth/verify-email", { token })
      .then(async (res) => {
        if (!res.data.emailVerified) {
          setState({ status: "error", message: t("verifyEmail.somethingWentWrong") });
          return;
        }
        setState({ status: "success" });
        await refreshUser();
        // Return to the page the user came from (no new /app tab on top).
        navigate({ to: redirect && isSafeRedirect(redirect) ? redirect : "/app", replace: true });
      })
      .catch((error) => {
        const code = (error as AxiosError<{ error?: { code?: string } }>).response?.data?.error?.code;
        if (code === "VERIFICATION_EXPIRED") {
          setState({ status: "expired" });
        } else {
          setState({
            status: "error",
            message: getApiErrorMessage(error, t("verifyEmail.invalidOrExpired")),
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || cooldown > 0 || resending) return;

    setResending(true);
    try {
      await resendVerification(email.trim(), redirect && isSafeRedirect(redirect) ? redirect : undefined);
      startCooldown();
    } catch {
      // The API always returns a generic message; surface it via the toast-like inline state.
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <img
          src="/lifeos-black-icon.png"
          alt={t("verifyEmail.logoAlt")}
          className="mx-auto mb-6 h-14 w-auto rounded-xl"
        />
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight text-foreground">
          {t("verifyEmail.title")}
        </h1>
        <p className="mb-6 text-center text-sm text-foreground/65">
          {t("verifyEmail.subtitle")}
        </p>

        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Spinner className="size-6" />
            <p className="text-sm text-foreground/70">{t("verifyEmail.verifying")}</p>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">{t("verifyEmail.verifiedHeading")}</h2>
            <p className="text-sm text-foreground/70">
              {t("verifyEmail.verifiedSubtitle")}
            </p>
            <Link
              to="/app"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("verifyEmail.goToDashboard")}
            </Link>
          </div>
        )}

        {state.status === "expired" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <TriangleAlert className="size-10 text-amber-600 dark:text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">{t("verifyEmail.linkExpired")}</h2>
            <p className="text-sm text-foreground/70">
              {t("verifyEmail.linkExpiredSubtitle")}
            </p>
            <RequestForm
              email={email}
              setEmail={setEmail}
              cooldown={cooldown}
              resending={resending}
              onSubmit={handleResend}
            />
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CircleX className="size-10 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">{t("verifyEmail.couldNotVerify")}</h2>
            <p className="text-sm text-foreground/70">{state.message}</p>
            <RequestForm
              email={email}
              setEmail={setEmail}
              cooldown={cooldown}
              resending={resending}
              onSubmit={handleResend}
            />
          </div>
        )}

        {state.status === "no-token" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <MailCheck className="size-10 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("verifyEmail.verifyHeading")}</h2>
            <p className="text-sm text-foreground/70">
              {t("verifyEmail.enterEmailSubtitle")}
            </p>
            <RequestForm
              email={email}
              setEmail={setEmail}
              cooldown={cooldown}
              resending={resending}
              onSubmit={handleResend}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RequestForm({
  email,
  setEmail,
  cooldown,
  resending,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  cooldown: number;
  resending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation("auth");
  return (
    <form onSubmit={onSubmit} className="mt-3 w-full space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("verifyEmail.emailPlaceholder")}
        autoComplete="email"
        required
        className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus:border-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
      <button
        type="submit"
        disabled={cooldown > 0 || resending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resending ? <Spinner className="size-4" /> : null}
        {cooldown > 0
          ? t("verifyEmail.resendIn", { count: cooldown })
          : resending
            ? t("verifyEmail.sending")
            : t("verifyEmail.sendVerificationEmail")}
      </button>
    </form>
  );
}
