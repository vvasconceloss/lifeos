import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";
import { formatShortDate } from "@/lib/i18n-format";

export default function AccountRecoveryPage() {
  const { t } = useTranslation("auth");
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function handleRecover() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post("/account/cancel-deletion");
      await refreshUser();
      toast.success(t("accountRecovery.accountRecovered"));
      navigate({ to: "/app", replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("accountRecovery.failedToRecover")));
    } finally {
      setSubmitting(false);
    }
  }

  const scheduledDate = user?.scheduledDeletionAt
    ? formatShortDate(new Date(user.scheduledDeletionAt))
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <img
          src="/lifeos-black-icon.png"
          alt={t("accountRecovery.logoAlt")}
          className="mx-auto mb-6 h-14 w-auto rounded-xl"
        />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border/80 bg-card p-6 text-center">
          <CalendarClock className="size-10 text-amber-600 dark:text-amber-500" />
          <h1 className="text-lg font-semibold text-foreground">
            {t("accountRecovery.title")}
          </h1>
          <p className="text-sm text-foreground/70">
            {scheduledDate
              ? t("accountRecovery.deletionDate", { date: scheduledDate })
              : t("accountRecovery.scheduledForDeletion")}{" "}
            {t("accountRecovery.recoverNow")}
          </p>
          <button
            type="button"
            onClick={handleRecover}
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Spinner className="size-4" /> : null}
            {submitting ? t("accountRecovery.recovering") : t("accountRecovery.recoverButton")}
          </button>
          <button
            type="button"
            onClick={() => void logout().then(() => navigate({ to: "/login", replace: true }))}
            className="text-xs text-foreground/60 underline underline-offset-4 hover:text-foreground"
          >
            {t("accountRecovery.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
