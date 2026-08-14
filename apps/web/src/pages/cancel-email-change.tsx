import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleX } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";

type State =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function CancelEmailChangePage() {
  const { t } = useTranslation("auth");
  const { token } = useSearch({ from: "/account/email/cancel" });
  const [state, setState] = useState<State>(
    token
      ? { status: "loading" }
      : { status: "error", message: t("cancelEmailChange.missingLink") },
  );
  const sentRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (sentRef.current) return;
    sentRef.current = true;

    api
      .post("/account/change-email/cancel", { token })
      .then(() => setState({ status: "success" }))
      .catch((error) => {
        setState({ status: "error", message: getApiErrorMessage(error, t("cancelEmailChange.couldNotCancel")) });
      });
  }, [token, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
          {t("cancelEmailChange.title")}
        </h1>

        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Spinner className="size-6" />
            <p className="text-sm text-foreground/70">{t("cancelEmailChange.cancelling")}</p>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">{t("cancelEmailChange.changeCancelled")}</h2>
            <p className="text-sm text-foreground/70">
              {t("cancelEmailChange.changeCancelledSubtitle")}
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("cancelEmailChange.goToSignIn")}
            </Link>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CircleX className="size-10 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">{t("cancelEmailChange.couldNotCancelHeading")}</h2>
            <p className="text-sm text-foreground/70">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
