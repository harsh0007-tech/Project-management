import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";

import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { EmptyState } from "@/components/taskflow/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, useTasks } from "@/hooks/useTaskflow";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — TaskFlow" },
      {
        name: "description",
        content: "Browse every project in your workspace and track completion at a glance.",
      },
      { property: "og:title", content: "Projects — TaskFlow" },
      { property: "og:description", content: "Browse every project in your workspace." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { workspace, isManager } = useAuth();
  const projects = useProjects(workspace?.id);
  const tasks = useTasks(workspace?.id);
  const [query, setQuery] = useState("");

  const filtered = (projects.data ?? []).filter((project) =>
    project.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything your team is working on.</p>
        </div>
        {isManager ? (
          <ProjectFormDialog
            trigger={
              <Button>
                <Plus className="mr-2 size-4" aria-hidden />
                New project
              </Button>
            }
          />
        ) : null}
      </header>

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Search projects"
          aria-label="Search projects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {projects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={(tasks.data ?? []).filter((task) => task.project_id === project.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderKanban className="size-8" aria-hidden />}
          title={query ? "No matching projects" : "No projects yet"}
          description={
            query
              ? "Try a different search term."
              : isManager
                ? "Create a project to start organizing your team's work."
                : "A task manager will create projects for your team."
          }
        />
      )}
    </div>
  );
}
