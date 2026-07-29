import { toast } from "sonner";
import { api } from "@/lib/api";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, type ChangeEvent } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Pencil, Trash2, X, Check, Plus } from "lucide-react";

interface Pillar {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function SettingsPillarsPage() {
  const { logout, user } = useAuth();
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPillars() {
      try {
        const res = await api.get<{ pillars: Pillar[] }>("/pillars");
        setPillars(res.data.pillars);
      } catch {
        toast.error("Failed to load pillars");
      } finally {
        setLoading(false);
      }
    }

    fetchPillars();
  }, []);

  async function handleCreate(e: ChangeEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const res = await api.post<{ pillar: Pillar }>("/pillars", { name });
      setPillars((prev) => [...prev, res.data.pillar]);
      setNewName("");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        toast.error("Name must be between 1 and 100 characters");
      } else {
        toast.error("Failed to create pillar");
      }
    } finally {
      setCreating(false);
    }
  }

  function startEdit(pillar: Pillar) {
    setEditingId(pillar.id);
    setEditName(pillar.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;

    setSavingId(id);
    try {
      const res = await api.patch<{ pillar: Pillar }>(`/pillars/${id}`, { name });
      setPillars((prev) =>
        prev.map((p) => (p.id === id ? res.data.pillar : p)),
      );
      setEditingId(null);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        toast.error("Pillar not found");
      } else {
        toast.error("Failed to update pillar");
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/pillars/${id}`);
      setPillars((prev) => prev.filter((p) => p.id !== id));
      toast.success("Pillar deleted");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        toast.error("Cannot delete pillar with active habits. Archive or delete them first.");
      } else if (error instanceof AxiosError && error.response?.status === 404) {
        toast.error("Pillar not found");
      } else {
        toast.error("Failed to delete pillar");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <a href="/app" className="text-lg font-semibold text-foreground hover:text-primary">LifeOS</a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/65">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-foreground/65 underline underline-offset-4 hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg px-4 py-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
            Pillars
          </h2>

          <form onSubmit={handleCreate} className="mb-8 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New pillar name"
              className="block flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Spinner /> : <Plus className="size-4" />}
              Add
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : pillars.length === 0 ? (
            <p className="text-center text-sm text-foreground/50">
              No pillars yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {pillars.map((pillar) => (
                <li
                  key={pillar.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3"
                >
                  {editingId === pillar.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="block flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(pillar.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => saveEdit(pillar.id)}
                        disabled={savingId === pillar.id || !editName.trim()}
                        className="rounded-md p-1.5 text-foreground/65 hover:text-foreground disabled:opacity-50"
                        aria-label="Save"
                      >
                        {savingId === pillar.id ? <Spinner /> : <Check className="size-4" />}
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
                      <span className="flex-1 text-sm text-foreground">
                        {pillar.name}
                      </span>
                      <button
                        onClick={() => startEdit(pillar)}
                        className="rounded-md p-1.5 text-foreground/50 hover:text-foreground"
                        aria-label={`Edit ${pillar.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pillar.id)}
                        disabled={deletingId === pillar.id}
                        className="rounded-md p-1.5 text-foreground/50 hover:text-destructive disabled:opacity-50"
                        aria-label={`Delete ${pillar.name}`}
                      >
                        {deletingId === pillar.id ? (
                          <Spinner />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
