import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, CircleX } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";

type State =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function CancelEmailChangePage() {
  const { token } = useSearch({ from: "/account/email/cancel" });
  const [state, setState] = useState<State>(
    token
      ? { status: "loading" }
      : { status: "error", message: "This cancellation link is missing or incomplete." },
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
        setState({ status: "error", message: getApiErrorMessage(error, "Could not cancel the email change.") });
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
          Cancel email change
        </h1>

        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Spinner className="size-6" />
            <p className="text-sm text-foreground/70">Cancelling…</p>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CheckCircle2 className="size-10 text-green-600 dark:text-green-500" />
            <h2 className="text-lg font-semibold text-foreground">Change cancelled</h2>
            <p className="text-sm text-foreground/70">
              The email change request has been cancelled. Your account is unchanged.
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to sign in
            </Link>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
            <CircleX className="size-10 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Could not cancel</h2>
            <p className="text-sm text-foreground/70">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
