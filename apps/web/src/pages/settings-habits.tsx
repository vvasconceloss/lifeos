import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { ChevronDown, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { HabitCard } from "@/components/habit-card";
import { NewHabitModal } from "@/components/new-habit-modal";
import { ProtectedRoute } from "@/components/protected-route";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
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

export default function SettingsHabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showArchived, setShowArchived] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPillarId, setEditPillarId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setError(false);
      try {
        const [habitsRes, pillarsRes] = await Promise.all([
          api.get<{ habits: Habit[] }>("/habits?includeArchived=true"),
          api.get<{ pillars: Pillar[] }>("/pillars"),
        ]);
        setHabits(habitsRes.data.habits);
        setPillars(pillarsRes.data.pillars);
      } catch (error) {
        if (!isUnauthorizedError(error)) setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [reloadKey]);

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  const displayedHabits = showArchived
    ? habits
    : habits.filter((h) => h.isActive);

  const habitsByPillar = pillars
    .map((p) => ({
      ...p,
      habits: displayedHabits.filter((h) => h.pillarId === p.id),
    }))
    .filter((g) => g.habits.length > 0);

  const ungroupedHabits = displayedHabits.filter(
    (h) => !pillars.some((p) => p.id === h.pillarId),
  );

  function handleCreated(habit: Habit) {
    setHabits((prev) => [...prev, habit]);
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
      <AppLayout>
        <main className="mx-auto w-full max-w-lg px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Habits
            </h2>
            <NewHabitModal pillars={pillars} onCreated={handleCreated} />
          </div>

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

          {loading ? (
            <div className="flex justify-center py-16 text-foreground/50">
              <Spinner className="size-5" />
            </div>
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : displayedHabits.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="size-8" />}
              title={showArchived ? "No habits yet" : "No active habits"}
              description={
                showArchived
                  ? "Habits you archive will appear here."
                  : "Create your first habit and associate it with a pillar."
              }
              action={<NewHabitModal pillars={pillars} onCreated={handleCreated} />}
            />
          ) : (
            <div className="space-y-5">
              {ungroupedHabits.length > 0 && (
                <div>
                  <ul className="space-y-2">
                    {ungroupedHabits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        editingId={editingId}
                        editName={editName}
                        editDescription={editDescription}
                        editPillarId={editPillarId}
                        pillars={pillars}
                        savingId={savingId}
                        deletingId={deletingId}
                        archivingId={archivingId}
                        onEditName={setEditName}
                        onEditDescription={setEditDescription}
                        onEditPillarId={setEditPillarId}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {habitsByPillar.map((group) => (
                <div key={group.id}>
                  <h3
                    className="mb-2 text-sm font-semibold"
                    style={{
                      borderLeft: group.color ? `3px solid ${group.color}` : undefined,
                      paddingLeft: group.color ? "12px" : undefined,
                      color: group.color ?? undefined,
                    }}
                  >
                    {group.name}
                  </h3>
                  <ul className="space-y-2">
                    {group.habits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        editingId={editingId}
                        editName={editName}
                        editDescription={editDescription}
                        editPillarId={editPillarId}
                        pillars={pillars}
                        savingId={savingId}
                        deletingId={deletingId}
                        archivingId={archivingId}
                        onEditName={setEditName}
                        onEditDescription={setEditDescription}
                        onEditPillarId={setEditPillarId}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
