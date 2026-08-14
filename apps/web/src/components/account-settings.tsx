import { toast } from "sonner";
import { AxiosError } from "axios";
import { useState, type FormEvent } from "react";
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
                  aria-label="Password requirements"
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
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {requirements ? <PasswordStrengthMeter password={value} email={email} /> : null}
    </div>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/account/change-password", { currentPassword, newPassword });
      toast.success("Password updated");
      onDone();
    } catch (error) {
      const code = getErrorCode(error);
      if (code === "INCORRECT_PASSWORD") toast.error("Current password is incorrect");
      else if (code === "SAME_PASSWORD") toast.error("New password must be different from the current one");
      else toast.error(getApiErrorMessage(error, "Failed to update password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PasswordField
        id="cp-current"
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
      />
      <PasswordField
        id="cp-new"
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        requirements
      />
      <PasswordField
        id="cp-confirm"
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Spinner className="size-4" /> : <KeyRound className="size-4" />}
        {submitting ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}

function ChangeEmailForm({ onDone }: { onDone: () => void }) {
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
      if (code === "INCORRECT_PASSWORD") toast.error("Current password is incorrect");
      else if (code === "NEW_EMAIL_SAME") toast.error("New email must be different from the current one");
      else toast.error(getApiErrorMessage(error, "Failed to request the email change"));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-border/80 bg-card p-4 text-sm text-foreground/70">
          We sent a confirmation link to the new address and an alert to your current email. If the
          request is valid, you&apos;ll receive the confirmation email.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-foreground/70">
        Current email: <span className="font-medium text-foreground">{user?.email}</span>
      </p>
      <PasswordField
        id="ce-current"
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
      />
      <div>
        <label htmlFor="ce-new" className="text-xs font-medium text-foreground/60">
          New email
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
        {submitting ? "Requesting…" : "Change email"}
      </button>
      <p className="text-xs text-foreground/60">
        You&apos;ll confirm the change from the link sent to the new address. Your email stays
        unchanged until then.
      </p>
    </form>
  );
}

export function AccountSettings() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Other sessions will be signed out. This one stays active.
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onDone={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change email</DialogTitle>
            <DialogDescription>
              Requires confirmation at the new address. A security alert goes to your current email.
            </DialogDescription>
          </DialogHeader>
          <ChangeEmailForm onDone={() => setEmailOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              Your account will be scheduled for permanent deletion in 15 days. You can recover it
              at any point before then, but all of your data will be erased afterwards.
            </DialogDescription>
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
        Change password
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full justify-start"
        onClick={() => setEmailOpen(true)}
      >
        <Mail className="size-4" />
        Change email
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="w-full justify-start"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete account
      </Button>
    </div>
  );
}

function DeleteAccountForm({ onDone }: { onDone: () => void }) {
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
      toast.success("Account deletion scheduled. You can recover it within 15 days.");
      onDone();
      // The backend clears the session cookie; clear local auth state and send
      // the user back to the login page (same as after an email change).
      await logout();
      navigate({ to: "/login", replace: true });
    } catch (error) {
      const code = getErrorCode(error);
      if (code === "INCORRECT_PASSWORD") toast.error("Current password is incorrect");
      else if (code === "ALREADY_PENDING_DELETION") toast.error("Deletion was already requested");
      else toast.error(getApiErrorMessage(error, "Failed to request account deletion"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="da-current" className="text-xs font-medium text-foreground/60">
          Current password
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
            aria-label={show ? "Hide password" : "Show password"}
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
        {submitting ? "Requesting…" : "Schedule deletion"}
      </button>
    </form>
  );
}
