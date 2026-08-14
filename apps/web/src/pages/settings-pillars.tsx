import { toast } from "sonner";
import { api } from "@/lib/api";
import { Layers } from "lucide-react";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/app-layout";
import { PillarCard } from "@/components/pillar-card";
import { ProtectedRoute } from "@/components/protected-route";
import { NewPillarModal } from "@/components/new-pillar-modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPillarsPage() {
  const { t } = useTranslation("habits");
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPillars() {
      setError(false);
      try {
        const res = await api.get<{ pillars: Pillar[] }>("/pillars");
        setPillars(res.data.pillars);
      } catch (error) {
        if (!isUnauthorizedError(error)) setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPillars();
  }, [reloadKey]);

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  function handleCreated(pillar: Pillar) {
    setPillars((prev) => [...prev, pillar]);
  }

  function handleUpdated(updated: Pillar) {
    setPillars((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/pillars/${id}`);
      setPillars((prev) => prev.filter((p) => p.id !== id));
      toast.success(t("settingsPillars.deleted"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("settingsPillars.deleteFailed")));
    } finally {
      setDeletingId(null);
    }
  }

  async function movePillar(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= pillars.length) return;
    const next = [...pillars];
    [next[index], next[target]] = [next[target], next[index]];
    setPillars(next);
    try {
      await api.post("/pillars/reorder", { ids: next.map((p) => p.id) });
    } catch {
      toast.error(t("settingsPillars.reorderFailed"));
      reload();
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col overflow-y-auto scroll-subtle px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("common:pillars")}
            </h2>
            <NewPillarModal onCreated={handleCreated} />
          </div>
          {loading ? (
            <div className="flex justify-center py-16 text-foreground/60">
              <Spinner className="size-5" />
            </div>
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : pillars.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon={<Layers className="size-8" />}
              title={t("settingsPillars.noPillars")}
              description={t("settingsPillars.noPillarsDescription")}
              action={<NewPillarModal onCreated={handleCreated} />}
            />
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col space-y-2">
              {pillars.map((pillar, index) => (
                <PillarCard
                  key={pillar.id}
                  pillar={pillar}
                  deletingId={deletingId}
                  canMoveUp={index > 0}
                  canMoveDown={index < pillars.length - 1}
                  onMoveUp={() => movePillar(index, -1)}
                  onMoveDown={() => movePillar(index, 1)}
                  onDelete={handleDelete}
                  onUpdated={handleUpdated}
                />
              ))}
            </ul>
          )}
        </main>
      </AppLayout>
    </ProtectedRoute>
  );
}
