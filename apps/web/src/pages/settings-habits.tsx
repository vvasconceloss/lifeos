import { toast } from "sonner";
import { api } from "@/lib/api";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Archive, Check, CheckCircle2, Circle, ChevronDown, Pencil, Plus, Settings, LogOut, Trash2, X } from "lucide-react";

interface Pillar {
  id: string;
  name: string;
}

interface Habit {
  id: string;
  name: string;
  description: string | null;
  pillarId: string;
  pillarName: string;
  isActive: boolean;
  archivedAt: string | null;
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function SettingsHabitsPage() {
  const { logout, user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPillarId, setNewPillarId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPillarId, setEditPillarId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0] as string;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [habitsRes, pillarsRes, compRes] = await Promise.all([
          api.get<{ habits: Habit[] }>("/habits"),
          api.get<{ pillars: Pillar[] }>("/pillars"),
          api.get<{ completions: Array<{ habitId: string }> }>(
            `/completions?from=${today}&to=${today}`,
          ),
        ]);
        setHabits(habitsRes.data.habits);
        setPillars(pillarsRes.data.pillars);
        setCompletedIds(
          new Set(compRes.data.completions.map((c) => c.habitId)),
        );
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [today]);

  const displayedHabits = showArchived
    ? habits
    : habits.filter((h) => h.isActive);

  const habitsByPillar = pillars.map((p) => ({
    ...p,
    habits: displayedHabits.filter((h) => h.pillarId === p.id),
  }));

  async function handleCreate(e: ChangeEvent) {
    e.preventDefault();
    if (!newName.trim() || !newPillarId) return;

    setCreating(true);
    try {
      const res = await api.post<{ habit: Habit }>("/habits", {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        pillarId: newPillarId,
      });
      setHabits((prev) => [...prev, res.data.habit]);
      setNewName("");
      setNewDescription("");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error("Name must be between 1 and 200 characters");
      } else {
        toast.error("Failed to create habit");
      }
    } finally {
      setCreating(false);
    }
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id);
    setEditName(habit.name);
    setEditDescription(habit.description ?? "");
    setEditPillarId(habit.pillarId);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSavingId(id);
    try {
      const res = await api.patch<{ habit: Habit }>(`/habits/${id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        ...(editPillarId ? { pillarId: editPillarId } : {}),
      });
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? res.data.habit : h)),
      );
      setEditingId(null);
    } catch {
      toast.error("Failed to update habit");
    } finally {
      setSavingId(null);
    }
  }

  async function handleArchive(id: string) {
    setArchivingId(id);
    try {
      const res = await api.post<{ habit: Habit }>(`/habits/${id}/archive`);
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? res.data.habit : h)),
      );
      toast.success("Habit archived");
    } catch {
      toast.error("Failed to archive habit");
    } finally {
      setArchivingId(null);
    }
  }

  async function toggleCompletion(habitId: string) {
    const wasCompleted = completedIds.has(habitId);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (wasCompleted) next.delete(habitId);
      else next.add(habitId);
      return next;
    });

    setTogglingId(habitId);
    try {
      if (wasCompleted) {
        await api.delete(`/habits/${habitId}/completions/${today}`);
      } else {
        await api.put(`/habits/${habitId}/completions/${today}`);
      }
    } catch {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.add(habitId);
        else next.delete(habitId);
        return next;
      });
      toast.error("Failed to update completion");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/habits/${id}`);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      toast.success("Habit deleted");
    } catch {
      toast.error("Failed to delete habit");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <a href="/app" className="text-lg font-semibold text-foreground hover:text-primary">LifeOS</a>
          <div className="relative flex items-center gap-3" ref={menuRef}>
            <span className="text-sm text-foreground/65">{user?.email}</span>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-background py-1 shadow-lg">
                <a
                  href="/app"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  Dashboard
                </a>
                <a
                  href="/settings/pillars"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  Pillars
                </a>
                <hr className="my-1 border-border" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg px-4 py-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
            Habits
          </h2>

          {/* Create form */}
          <form onSubmit={handleCreate} className="mb-8 space-y-3 rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-foreground">New habit</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Habit name"
              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <select
                value={newPillarId}
                onChange={(e) => setNewPillarId(e.target.value)}
                className="block flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select pillar</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={creating || !newName.trim() || !newPillarId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? <Spinner /> : <Plus className="size-4" />}
                Add
              </button>
            </div>
          </form>

          {/* Archived toggle */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="inline-flex items-center gap-1.5 text-sm text-foreground/65 hover:text-foreground"
            >
              <ChevronDown
                className={`size-4 transition-transform ${showArchived ? "rotate-180" : ""}`}
              />
              Show archived
            </button>
          </div>

          {/* Loading / Empty / List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : displayedHabits.length === 0 ? (
            <p className="text-center text-sm text-foreground/50">
              {showArchived ? "No habits yet." : "No active habits. Create one above."}
            </p>
          ) : (
            <div className="space-y-6">
              {habitsByPillar
                .filter((g) => g.habits.length > 0)
                .map((group) => (
                  <div key={group.id}>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      {group.name}
                    </h3>
                    <ul className="space-y-2">
                      {group.habits.map((habit) => (
                        <li
                          key={habit.id}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3"
                        >
                          {editingId === habit.id ? (
                            <>
                              <div className="flex flex-1 flex-col gap-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="block rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(habit.id);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                />
                                <input
                                  type="text"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="Description"
                                  className="block rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <select
                                  value={editPillarId}
                                  onChange={(e) => setEditPillarId(e.target.value)}
                                  className="block rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  {pillars.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={() => saveEdit(habit.id)}
                                disabled={savingId === habit.id || !editName.trim()}
                                className="rounded-md p-1.5 text-foreground/65 hover:text-foreground disabled:opacity-50"
                                aria-label="Save"
                              >
                                {savingId === habit.id ? <Spinner /> : <Check className="size-4" />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded-md p-1.5 text-foreground/65 hover:text-foreground"
                                aria-label="Cancel"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {habit.isActive && (
                                <button
                                  onClick={() => toggleCompletion(habit.id)}
                                  disabled={togglingId === habit.id}
                                  className="shrink-0 rounded-md p-0.5 text-foreground/50 hover:text-primary disabled:opacity-50"
                                  aria-label={
                                    completedIds.has(habit.id)
                                      ? "Unmark as completed"
                                      : "Mark as completed"
                                  }
                                >
                                  {completedIds.has(habit.id) ? (
                                    <CheckCircle2 className="size-5 text-primary" />
                                  ) : togglingId === habit.id ? (
                                    <Spinner />
                                  ) : (
                                    <Circle className="size-5" />
                                  )}
                                </button>
                              )}
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className={`text-sm ${habit.isActive ? "text-foreground" : "text-foreground/50 line-through"}`}>
                                  {habit.name}
                                </span>
                                {habit.description && (
                                  <span className="truncate text-xs text-foreground/50">
                                    {habit.description}
                                  </span>
                                )}
                              </div>
                              {habit.isActive && (
                                <>
                                  <button
                                    onClick={() => startEdit(habit)}
                                    className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
                                    aria-label={`Edit ${habit.name}`}
                                  >
                                    <Pencil className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => handleArchive(habit.id)}
                                    disabled={archivingId === habit.id}
                                    className="rounded-md p-1.5 text-foreground/50 hover:text-foreground disabled:opacity-50"
                                    aria-label={`Archive ${habit.name}`}
                                  >
                                    {archivingId === habit.id ? <Spinner /> : <Archive className="size-4" />}
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(habit.id)}
                                disabled={deletingId === habit.id}
                                className="rounded-md p-1.5 text-foreground/50 hover:text-destructive disabled:opacity-50"
                                aria-label={`Delete ${habit.name}`}
                              >
                                {deletingId === habit.id ? <Spinner /> : <Trash2 className="size-4" />}
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
