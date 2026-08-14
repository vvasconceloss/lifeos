import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleX, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";

type State =
  | { status: "loading" }
  | { status: "success" }
  | { status: "expired" }
  | { status: "error"; message: string };

export default function ConfirmEmailChangePage() {
  const { t } = useTranslation("auth");
  const { token } = useSearch({ from: "/account/email/confirm" });
  const { logout } = useAuth();
  const [state, setState] = useState<State>(
    token
      ? { status: "loading" }
      : { status: "error", message: t("confirmEmailChange.missingLink") },
  );
  const sentRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (sentRef.current) return;
    sentRef.current = true;

    api
      .post("/account/change-email/confirm", { token })
      .then(async () => {
        // The email changed — clear the old session so the user signs in again
        // with the new address (the backend also clears the token cookie).
        await logout();
        setState({ status: "success" });
      })
      .catch((error) => {
        const code = (error as AxiosError<{ error?: { code?: string } }>).response?.data?.error?.code;
        if (code === "EMAIL_CHANGE_EXPIRED") setState({ status: "expired" });
        else setState({ status: "error", message: getApiErrorMessage(error, t("confirmEmailChange.invalidOrUsed")) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
          {t("confirmEmailChange.title")}
        </h1>

        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Spinner className="size-6" />
            <p className="text-sm text-foreground/70">{t("confirmEmailChange.confirming")}</p>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">{t("confirmEmailChange.emailUpdated")}</h2>
            <p className="text-sm text-foreground/70">
              {t("confirmEmailChange.emailUpdatedSubtitle")}
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("confirmEmailChange.goToSignIn")}
            </Link>
          </div>
        )}

        {state.status === "expired" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <TriangleAlert className="size-10 text-amber-600 dark:text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">{t("confirmEmailChange.linkExpired")}</h2>
            <p className="text-sm text-foreground/70">
              {t("confirmEmailChange.linkExpiredSubtitle")}
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CircleX className="size-10 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">{t("confirmEmailChange.couldNotConfirm")}</h2>
            <p className="text-sm text-foreground/70">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
