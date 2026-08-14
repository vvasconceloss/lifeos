import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { AxiosError } from "axios";
import { CheckCircle2, CircleX, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";

type State =
  | { status: "loading" }
  | { status: "success" }
  | { status: "expired" }
  | { status: "error"; message: string };

export default function RecoverAccountPage() {
  const { token } = useSearch({ from: "/account/recover" });
  const [state, setState] = useState<State>(
    token
      ? { status: "loading" }
      : { status: "error", message: "This recovery link is missing or incomplete." },
  );
  const sentRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (sentRef.current) return;
    sentRef.current = true;

    api
      .post("/account/recover", { token })
      .then(() => setState({ status: "success" }))
      .catch((error) => {
        const code = (error as AxiosError<{ error?: { code?: string } }>).response?.data?.error?.code;
        if (code === "RECOVERY_EXPIRED") setState({ status: "expired" });
        else setState({ status: "error", message: getApiErrorMessage(error, "Invalid or used recovery link") });
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
          Recover your account
        </h1>

        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Spinner className="size-6" />
            <p className="text-sm text-foreground/70">Recovering your account…</p>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">Account recovered</h2>
            <p className="text-sm text-foreground/70">
              Your account is back and active. All of your data is intact.
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to sign in
            </Link>
          </div>
        )}

        {state.status === "expired" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <TriangleAlert className="size-10 text-amber-600 dark:text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">Link expired</h2>
            <p className="text-sm text-foreground/70">
              This recovery link has expired. If you still want to keep your account, sign in and
              cancel the deletion from the recovery screen.
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CircleX className="size-10 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Could not recover</h2>
            <p className="text-sm text-foreground/70">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
