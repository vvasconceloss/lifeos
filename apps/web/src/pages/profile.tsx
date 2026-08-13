import { toast } from "sonner";
import { api } from "@/lib/api";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
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
  { value: 1, label: "Monday" },
  { value: 0, label: "Sunday" },
  { value: 6, label: "Saturday" },
];

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function ProfileForm({ user, onSaved }: { user: User; onSaved: () => Promise<void> }) {
  const { setTheme } = useTheme();
  const [name, setName] = useState(user.name ?? "");
  const [themePref, setThemePref] = useState<"light" | "dark" | "system">(
    (user.theme as "light" | "dark" | "system") || "system",
  );
  const [timezone, setTimezone] = useState(user.timezone ?? "");
  const [weekStart, setWeekStart] = useState(user.weekStart ?? 1);
  const [gamification, setGamification] = useState(user.gamification);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim() || null,
        theme: themePref,
        weekStart,
        gamification,
      };
      if (timezone) payload.timezone = timezone;

      await api.patch("/auth/me", payload);
      setTheme(themePref);
      await onSaved();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Profile</h3>
        <p className="mb-3 text-xs text-foreground/60">Your display name across the app.</p>
        <div className="grid gap-2">
          <label htmlFor="p-name" className="text-xs font-medium text-foreground/60">
            Name
          </label>
          <input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Preferences</h3>
        <p className="mb-3 text-xs text-foreground/60">Theme, timezone and the day your week starts.</p>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="p-theme" className="text-xs font-medium text-foreground/60">
              Theme
            </label>
            <select
              id="p-theme"
              value={themePref}
              onChange={(e) => setThemePref(e.target.value as typeof themePref)}
              className={inputClass}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="p-tz" className="text-xs font-medium text-foreground/60">
              Timezone
            </label>
            <select
              id="p-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputClass}
            >
              <option value="">Not set</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="p-week" className="text-xs font-medium text-foreground/60">
              Week starts on
            </label>
            <select
              id="p-week"
              value={weekStart}
              onChange={(e) => setWeekStart(Number(e.target.value))}
              className={inputClass}
            >
              {WEEK_START_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-border/40 pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">Gamification</p>
              <p className="text-xs text-foreground/60">
                Show XP, levels and ranks. Off by default.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={gamification}
              aria-label="Toggle gamification"
              onClick={() => setGamification((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
        >
          {saving ? <Spinner className="size-4" /> : null}
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6">
          <div className="mb-6 flex items-center gap-4">
            {user && <UserAvatar email={user.email} className="size-14 text-xl" />}
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {user?.name || "Your profile"}
              </h2>
              <p className="truncate text-sm text-foreground/60">{user?.email}</p>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {user ? <ProfileForm key={user.id} user={user} onSaved={refreshUser} /> : null}
          </div>

          <div className="mt-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Feedback</h3>
            <p className="mt-1 text-xs text-foreground/60">
              Found a bug or have an idea? Open a GitHub issue and help improve LifeOS.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://github.com/vvasconceloss/lifeos/issues/new?template=bug.yml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-accent/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/60"
              >
                Report a bug
              </a>
              <a
                href="https://github.com/vvasconceloss/lifeos/issues/new?template=feature.yml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-accent/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/60"
              >
                Suggest a feature
              </a>
            </div>
          </div>
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
