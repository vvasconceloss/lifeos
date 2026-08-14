import { toast } from "sonner";
import { AxiosError } from "axios";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, Eye, EyeOff, Info, KeyRound, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/errors";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PasswordRequirementsList,
  PasswordStrengthMeter,
} from "@/components/password-requirements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 transition-colors hover:border-foreground/40 focus:border-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50";

function getErrorCode(error: unknown): string | undefined {
  return (error as AxiosError<{ error?: { code?: string } }>).response?.data?.error?.code;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  email,
  requirements = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  email?: string;
  requirements?: boolean;
}) {
  const [show, setShow] = useState(false);
  const { t } = useTranslation("settings");

  return (
    <div>
      <div className="flex items-center gap-x-1">
        <label htmlFor={id} className="text-xs font-medium text-foreground/60">
          {label}
        </label>
        {requirements ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex size-5 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={t("passwordRequirements")}
                >
                  <Info className="size-4" />
                </button>
              }
            />
            <TooltipContent side="left" align="center" className="w-64">
              <PasswordRequirementsList password={value} email={email} />
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="relative">
        <input
          id={id}
          name={`lifeos-${id}`}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="new-password"
          className={`${inputClass} pr-14`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
          aria-label={show ? t("hidePassword") : t("showPassword")}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {requirements ? <PasswordStrengthMeter password={value} email={email} /> : null}
    </div>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("settings");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    if (newPassword !== confirmPassword) {
      toast.error(t("changePassword.mismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/account/change-password", { currentPassword, newPassword });
      toast.success(t("changePassword.updated"));
      onDone();
    } catch (error) {
      const code = getErrorCode(error);
      if (code === "INCORRECT_PASSWORD") toast.error(t("currentPasswordIncorrect"));
      else if (code === "SAME_PASSWORD") toast.error(t("changePassword.sameAsCurrent"));
      else toast.error(getApiErrorMessage(error, t("changePassword.failed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PasswordField
        id="cp-current"
        label={t("currentPassword")}
        value={currentPassword}
        onChange={setCurrentPassword}
      />
      <PasswordField
        id="cp-new"
        label={t("newPassword")}
        value={newPassword}
        onChange={setNewPassword}
        requirements
      />
      <PasswordField
        id="cp-confirm"
        label={t("confirmNewPassword")}
        value={confirmPassword}
        onChange={setConfirmPassword}
      />
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Spinner className="size-4" /> : <KeyRound className="size-4" />}
        {submitting ? t("changePassword.submitting") : t("changePassword.submit")}
      </button>
    </form>
  );
}

function ChangeEmailForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      await api.post("/account/change-email/request", {
        currentPassword,
        newEmail,
      });
      setSent(true);
      setCurrentPassword("");
      setNewEmail("");
    } catch (error) {
      const code = getErrorCode(error);
      if (code === "INCORRECT_PASSWORD") toast.error(t("currentPasswordIncorrect"));
      else if (code === "NEW_EMAIL_SAME") toast.error(t("changeEmail.sameAsCurrent"));
      else toast.error(getApiErrorMessage(error, t("changeEmail.failed")));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-border/80 bg-card p-4 text-sm text-foreground/70">
          {t("changeEmail.sent")}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("common:close")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-foreground/70">
        {t("changeEmail.currentEmail")} <span className="font-medium text-foreground">{user?.email}</span>
      </p>
      <PasswordField
        id="ce-current"
        label={t("currentPassword")}
        value={currentPassword}
        onChange={setCurrentPassword}
      />
      <div>
        <label htmlFor="ce-new" className="text-xs font-medium text-foreground/60">
          {t("newEmail")}
        </label>
        <input
          id="ce-new"
          name="lifeos-new-email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          autoComplete="off"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Spinner className="size-4" /> : <Mail className="size-4" />}
        {submitting ? t("changeEmail.submitting") : t("changeEmail.submit")}
      </button>
      <p className="text-xs text-foreground/60">{t("changeEmail.hint")}</p>
    </form>
  );
}

export function AccountSettings() {
  const { t } = useTranslation("settings");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("changePassword.title")}</DialogTitle>
            <DialogDescription>{t("changePassword.description")}</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onDone={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("changeEmail.title")}</DialogTitle>
            <DialogDescription>{t("changeEmail.description")}</DialogDescription>
          </DialogHeader>
          <ChangeEmailForm onDone={() => setEmailOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteAccount.title")}</DialogTitle>
            <DialogDescription>{t("deleteAccount.description")}</DialogDescription>
          </DialogHeader>
          <DeleteAccountForm onDone={() => setDeleteOpen(false)} />
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full justify-start"
        onClick={() => setPasswordOpen(true)}
      >
        <KeyRound className="size-4" />
        {t("changePassword.title")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full justify-start"
        onClick={() => setEmailOpen(true)}
      >
        <Mail className="size-4" />
        {t("changeEmail.title")}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="w-full justify-start"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
        {t("deleteAccount.title")}
      </Button>
    </div>
  );
}

function DeleteAccountForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("settings");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [show, setShow] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      await api.post("/account/delete", { currentPassword });
      toast.success(t("deleteAccount.scheduled"));
      onDone();
      // The backend clears the session cookie; clear local auth state and send
      // the user back to the login page (same as after an email change).
      await logout();
      navigate({ to: "/login", replace: true });
    } catch (error) {
      const code = getErrorCode(error);
      if (code === "INCORRECT_PASSWORD") toast.error(t("currentPasswordIncorrect"));
      else if (code === "ALREADY_PENDING_DELETION") toast.error(t("deleteAccount.alreadyRequested"));
      else toast.error(getApiErrorMessage(error, t("deleteAccount.failed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="da-current" className="text-xs font-medium text-foreground/60">
          {t("currentPassword")}
        </label>
        <div className="relative">
          <input
            id="da-current"
            name="lifeos-da-current"
            type={show ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={`${inputClass} pr-14`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
            aria-label={show ? t("hidePassword") : t("showPassword")}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
        {submitting ? t("deleteAccount.submitting") : t("deleteAccount.submit")}
      </button>
    </form>
  );
}
