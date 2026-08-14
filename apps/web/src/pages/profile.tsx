import { Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user-avatar";
import { LanguageSelector } from "@/components/language-selector";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { AccountSettings } from "@/components/account-settings";
import type { User } from "@/contexts/AuthContextBase";

const TIMEZONES = [
  "UTC",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const WEEK_START_OPTIONS = [
  { value: 1, labelKey: "weekStart.monday" },
  { value: 0, labelKey: "weekStart.sunday" },
  { value: 6, labelKey: "weekStart.saturday" },
];

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 transition-colors hover:border-foreground/40 focus:border-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50";

const errorInputClass =
  "border-destructive hover:border-destructive/70 focus:border-destructive focus:ring-destructive/30";

function ProfileForm({ user, onSaved }: { user: User; onSaved: () => Promise<void> }) {
  const { t } = useTranslation("settings");
  const { setTheme } = useTheme();
  const [name, setName] = useState(user.name ?? "");
  const [themePref, setThemePref] = useState<"light" | "dark" | "system">(
    (user.theme as "light" | "dark" | "system") || "system",
  );
  const [timezone, setTimezone] = useState(user.timezone ?? "");
  const [weekStart, setWeekStart] = useState(user.weekStart ?? 1);
  const [gamification, setGamification] = useState(user.gamification);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState(false);
  const successTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) window.clearTimeout(successTimer.current);
    };
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (nameError && value.trim()) setNameError(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError(true);
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        theme: themePref,
        weekStart,
        gamification,
      };
      if (timezone) payload.timezone = timezone;

      await api.patch("/auth/me", payload);
      setTheme(themePref);
      await onSaved();
      toast.success("Profile updated");
      setSaved(true);
      successTimer.current = window.setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error(t("profileUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="mb-3 text-xs text-foreground/60">{t("nameDescription")}</p>
        <div className="grid gap-2">
          <label htmlFor="p-name" className="text-xs font-medium text-foreground/60">
            {t("name")}
          </label>
          <div className="relative">
            <input
              id="p-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Your name"
              disabled={saving}
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "p-name-error" : undefined}
              className={cn(inputClass, nameError && errorInputClass, "w-full rounded-lg")}
            />
          </div>
          {nameError && (
            <p id="p-name-error" role="alert" className="text-xs text-destructive">
              Name is required
            </p>
          )}
        </div>

        {!user.isDemo ? (
          <div className="mt-5 border-t border-border/40 pt-4">
            <AccountSettings />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">{t("preferences")}</h3>
        <p className="mb-3 text-xs text-foreground/60">{t("preferencesDescription")}</p>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="p-theme" className="text-xs font-medium text-foreground/60">
              {t("theme.label")}
            </label>
            <select
              id="p-theme"
              value={themePref}
              onChange={(e) => setThemePref(e.target.value as typeof themePref)}
              disabled={saving}
              className={cn(inputClass)}
            >
              <option value="system">{t("theme.system")}</option>
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="p-tz" className="text-xs font-medium text-foreground/60">
              {t("timezone")}
            </label>
            <select
              id="p-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={saving}
              className={cn(inputClass)}
            >
              <option value="">{t("common:notSet")}</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="p-week" className="text-xs font-medium text-foreground/60">
              {t("weekStart.label")}
            </label>
            <select
              id="p-week"
              value={weekStart}
              onChange={(e) => setWeekStart(Number(e.target.value))}
              disabled={saving}
              className={cn(inputClass)}
            >
              {WEEK_START_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <LanguageSelector />

          <div className="flex items-start justify-between gap-3 border-t border-border/40 pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("gamification")}</p>
              <p className="text-xs text-foreground/60">{t("gamificationDescription")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={gamification}
              aria-label={t("gamificationToggle")}
              onClick={() => setGamification((v) => !v)}
              disabled={saving}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                gamification ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 rounded-full bg-background shadow-sm transition-transform",
                  gamification ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="sticky bottom-0 z-10 -mx-6 flex justify-end border-t border-border/40 bg-background/95 px-6 py-3 backdrop-blur-sm">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={cn(
              "inline-flex min-w-44 h-9 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
              saved
                ? "bg-emerald-500 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {saving ? <Spinner className="size-4" /> : null}
            {saving ? "Saving..." : saved ? <Check className="size-4" /> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation("settings");

  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-6">
          <div className="mb-6 flex items-center gap-4">
            {user && <UserAvatar email={user.email} className="size-14 text-xl" />}
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {user?.name || t("yourProfile")}
              </h2>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm text-foreground/60">{user?.email}</p>
                {user?.emailVerified && !user.isDemo ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-500">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {t("verified")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {user ? <ProfileForm key={user.id} user={user} onSaved={refreshUser} /> : null}
          </div>
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
