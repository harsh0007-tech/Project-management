import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  ListTodo,
} from "lucide-react";

import { StatsCard } from "@/components/dashboard/StatsCard";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { EmptyState, SectionCard } from "@/components/taskflow/ui-bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, useTasks, useWorkspaceMembers } from "@/hooks/useTaskflow";
import { greeting, isOverdue, progressOf } from "@/lib/format";
import type { Profile, Task } from "@/lib/types";
import { ProjectCard } from "@/components/projects/ProjectCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TaskFlow" },
      {
        name: "description",
        content: "See your workspace at a glance: active projects, open tasks and what's due.",
      },
      { property: "og:title", content: "Dashboard — TaskFlow" },
      { property: "og:description", content: "Your projects, tasks and deadlines at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, workspace, isManager } = useAuth();
  const projects = useProjects(workspace?.id);
  const tasks = useTasks(workspace?.id);
  const members = useWorkspaceMembers(workspace?.id);
  const [selected, setSelected] = useState<Task | null>(null);

  const people = useMemo(
    () => (members.data ?? []).map((member) => member.profile).filter(Boolean) as Profile[],
    [members.data],
  );

  const all = tasks.data ?? [];
  const mine = all.filter((task) => task.assigned_to === profile?.id);
  const stats = {
    projects: projects.data?.length ?? 0,
    open: all.filter((task) => task.status !== "done").length,
    done: all.filter((task) => task.status === "done").length,
    overdue: all.filter((task) => task.status !== "done" && isOverdue(task.due_date)).length,
  };
  const upcoming = [...mine]
    .filter((task) => task.status !== "done")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {profile?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {progressOf(all).percent}% of workspace tasks are complete.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Projects"
          value={stats.projects}
          icon={FolderKanban}
          loading={projects.isLoading}
        />
        <StatsCard
          label="Open tasks"
          value={stats.open}
          icon={ListTodo}
          loading={tasks.isLoading}
        />
        <StatsCard
          label="Completed"
          value={stats.done}
          icon={CheckCircle2}
          loading={tasks.isLoading}
        />
        <StatsCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          loading={tasks.isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="My upcoming tasks"
          className="xl:col-span-2"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/tasks">View all</Link>
            </Button>
          }
        >
          {tasks.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : upcoming.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={people.find((person) => person.id === task.assigned_to) ?? null}
                  onOpen={() => setSelected(task)}
                />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You have no open tasks assigned. Nice work.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Recent projects"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/projects">All projects</Link>
            </Button>
          }
        >
          {projects.isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          ) : projects.data?.length ? (
            <div className="space-y-3">
              {projects.data.slice(0, 3).map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  tasks={all.filter((task) => task.project_id === project.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No projects yet"
              description={
                isManager
                  ? "Create your first project to get started."
                  : "A task manager will add projects soon."
              }
              action={
                isManager ? (
                  <Button asChild>
                    <Link to="/projects">Create project</Link>
                  </Button>
                ) : null
              }
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Messages"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/messages">Open messages</Link>
          </Button>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Keep your team conversations in one place.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a private conversation with any team member or task manager.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/messages">Go to chat</Link>
          </Button>
        </div>
      </SectionCard>

      <TaskDetailDialog
        task={selected}
        people={people}
        canManage={isManager}
        open={!!selected}
        onOpenChange={(next) => !next && setSelected(null)}
      />
    </div>
  );
}
