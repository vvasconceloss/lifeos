import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PillarCard } from "@/components/pillar-card";
import { ProtectedRoute } from "@/components/protected-route";
import { NewPillarModal } from "@/components/new-pillar-modal";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPillarsPage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
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

  function handleCreated(pillar: Pillar) {
    setPillars((prev) => [...prev, pillar]);
  }

  function startEdit(pillar: Pillar) {
    setEditingId(pillar.id);
    setEditName(pillar.name);
    setEditColor(pillar.color ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSavingId(id);
    try {
      const body: Record<string, string> = { name: editName.trim() };
      if (editColor) body.color = editColor;
      else body.color = "";
      const res = await api.patch<{ pillar: Pillar }>(`/pillars/${id}`, body);
      setPillars((prev) =>
        prev.map((p) => (p.id === id ? res.data.pillar : p)),
      );
      setEditingId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update pillar"));
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
      toast.error(getApiErrorMessage(error, "Failed to delete pillar"));
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
              Pillars
            </h2>
            <NewPillarModal onCreated={handleCreated} />
          </div>
          {pillars.length === 0 && !loading ? (
            <p className="text-center text-sm text-foreground/50">
              No pillars yet. Create one above.
            </p>
          ) : pillars.length > 0 ? (
            <ul className="space-y-2">
              {pillars.map((pillar) => (
                <PillarCard
                  key={pillar.id}
                  pillar={pillar}
                  editingId={editingId}
                  editName={editName}
                  editColor={editColor}
                  savingId={savingId}
                  deletingId={deletingId}
                  onEditName={setEditName}
                  onEditColor={setEditColor}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          ) : null}
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
