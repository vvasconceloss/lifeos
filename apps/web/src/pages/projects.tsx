import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { FolderKanban } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ProjectCard } from "@/components/projects/project-card";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type { Project } from "@/components/projects/types";

interface Pillar {
  id: string;
  name: string;
  color: string | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setError(false);
      try {
        const [projectsRes, pillarsRes] = await Promise.all([
          api.get<{ projects: Project[] }>("/projects"),
          api.get<{ pillars: Pillar[] }>("/pillars"),
        ]);
        setProjects(projectsRes.data.projects);
        setPillars(pillarsRes.data.pillars);
      } catch (e) {
        if (!isUnauthorizedError(e)) setError(true);
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

  function handleCreated(project: Project) {
    setProjects((prev) => [...prev, project]);
  }

  function handleUpdated(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = pillars
    .map((p) => ({ ...p, projects: projects.filter((pr) => pr.pillarId === p.id) }))
    .filter((g) => g.projects.length > 0);
  const ungrouped = projects.filter((p) => !pillars.some((pl) => pl.id === p.pillarId));

  return (
    <ProtectedRoute>
      <AppLayout>
        <main className="mx-auto w-full max-w-3xl px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h2>
            <NewProjectModal pillars={pillars} onCreated={handleCreated} />
          </div>
          {loading ? (
            <div className="flex justify-center py-16 text-foreground/60">
              <Spinner className="size-5" />
            </div>
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="size-8" />}
              title="No projects yet"
              description="Organize structured work — define tasks and watch the project's progress update as you complete them."
              action={<NewProjectModal pillars={pillars} onCreated={handleCreated} />}
            />
          ) : (
            <div className="space-y-5">
              {ungrouped.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground/70">Other</h3>
                  <ul className="space-y-2">
                    {ungrouped.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        pillars={pillars}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                        onUpdated={handleUpdated}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {grouped.map((group) => (
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
                    {group.projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        pillars={pillars}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                        onUpdated={handleUpdated}
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
