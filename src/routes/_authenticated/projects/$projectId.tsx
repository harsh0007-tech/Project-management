import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Plus, Trash2, UserPlus } from "lucide-react";

import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { ProgressBar, UserAvatar } from "@/components/taskflow/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  qk,
  useProjectMembers,
  useProjects,
  useTasks,
  useWorkspaceMembers,
  useWorkspaceProjectMemberCounts,
} from "@/hooks/useTaskflow";
import { formatDate, progressOf } from "@/lib/format";
import type { Profile, Task } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    task: typeof search["task"] === "string" ? search["task"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Project board — TaskFlow" },
      {
        name: "description",
        content: "Track this project's tasks on a drag-and-drop Kanban board.",
      },
      { property: "og:title", content: "Project board — TaskFlow" },
      { property: "og:description", content: "Track this project's tasks on a Kanban board." },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { task: requestedTask } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workspace, isManager } = useAuth();
  const projects = useProjects(workspace?.id);
  const tasks = useTasks(workspace?.id);
  const workspaceMembers = useWorkspaceMembers(workspace?.id);
  const projectMembers = useProjectMembers(projectId);
  const projectMemberCounts = useWorkspaceProjectMemberCounts(workspace?.id);

  const [selected, setSelected] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [addingMember, setAddingMember] = useState("");

  const project = projects.data?.find((item) => item.id === projectId) ?? null;
  const projectTasks = (tasks.data ?? []).filter((task) => task.project_id === projectId);
  const activeTask = selected ?? projectTasks.find((task) => task.id === requestedTask) ?? null;
  const progress = progressOf(projectTasks);

  const people = useMemo(
    () =>
      (workspaceMembers.data ?? []).map((member) => member.profile).filter(Boolean) as Profile[],
    [workspaceMembers.data],
  );
  const assignees = useMemo(() => {
    const memberIds = new Set((projectMembers.data ?? []).map((member) => member.user_id));
    const scoped = people.filter((person) => memberIds.has(person.id));
    return scoped.length ? scoped : people;
  }, [people, projectMembers.data]);

  const availableToAdd = people.filter((person) => {
    if ((projectMembers.data ?? []).some((member) => member.user_id === person.id)) return false;
    const workspaceMember = (workspaceMembers.data ?? []).find(
      (member) => member.user_id === person.id,
    );
    const projectCount = projectMemberCounts.data?.[person.id] ?? 0;
    return workspaceMember?.role !== "team_member" || projectCount < 3;
  });

  const addMember = async (userId: string) => {
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId });
    if (error) {
      toast.error(
        error.message.includes("maximum of 3 projects")
          ? "This team member already belongs to 3 projects."
          : "Unable to add that person to the project.",
      );
      return;
    }
    setAddingMember("");
    await queryClient.invalidateQueries({ queryKey: qk.projectMembers(projectId) });
    await queryClient.invalidateQueries({ queryKey: qk.projectMemberCounts(workspace?.id) });
    toast.success("Member added to the project.");
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from("project_members").delete().eq("id", memberId);
    if (error) {
      toast.error("Unable to remove that member.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: qk.projectMembers(projectId) });
    await queryClient.invalidateQueries({ queryKey: qk.projectMemberCounts(workspace?.id) });
    toast.success("Member removed from the project.");
  };

  const deleteProject = async () => {
    if (!window.confirm("Delete this project and all of its tasks?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      toast.error("Unable to delete the project.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: qk.projects(workspace?.id) });
    toast.success("Project deleted.");
    void navigate({ to: "/projects" });
  };

  if (projects.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!project) {
    return (
      <div className="glass-panel p-10 text-center">
        <h1 className="text-lg font-semibold">Project not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted or you don't have access.
        </p>
        <Button asChild className="mt-4">
          <Link to="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All projects
      </Link>

      <header className="glass-panel space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
            ) : null}
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden />
              {project.start_date ? formatDate(project.start_date) : "No start date"} →{" "}
              {project.due_date ? formatDate(project.due_date) : "No deadline"}
            </p>
          </div>
          {isManager ? (
            <div className="flex flex-wrap gap-2">
              <TaskFormDialog
                projectId={projectId}
                projectName={project.name}
                assignees={assignees}
                trigger={
                  <Button>
                    <Plus className="mr-2 size-4" aria-hidden />
                    New task
                  </Button>
                }
              />
              <ProjectFormDialog
                project={project}
                trigger={<Button variant="outline">Edit</Button>}
              />
              <Button variant="ghost" className="text-destructive" onClick={deleteProject}>
                <Trash2 className="mr-2 size-4" aria-hidden />
                Delete
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {progress.done} of {progress.total} tasks complete
            </span>
            <span className="font-medium text-foreground">{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Members</span>
          <div className="flex flex-wrap items-center gap-2">
            {(projectMembers.data ?? []).map((member) => (
              <span
                key={member.id}
                className="surface inline-flex items-center gap-2 px-2 py-1 text-xs"
              >
                <UserAvatar name={member.profile?.name ?? null} size="sm" />
                {member.profile?.name ?? "Member"}
                {isManager ? (
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${member.profile?.name ?? "member"} from project`}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
            {(projectMembers.data ?? []).length === 0 ? (
              <span className="text-xs text-muted-foreground">No members assigned yet</span>
            ) : null}
          </div>
          {isManager && availableToAdd.length ? (
            <div className="flex items-center gap-2">
              <div className="w-48">
                <Select value={addingMember} onValueChange={(value) => void addMember(value)}>
                  <SelectTrigger aria-label="Add project member">
                    <SelectValue placeholder="Add member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <UserPlus className="size-4 text-muted-foreground" aria-hidden />
            </div>
          ) : null}
          {isManager ? (
            <p className="basis-full text-xs text-muted-foreground">
              Team members can be assigned to up to 3 projects in this workspace.
            </p>
          ) : null}
        </div>
      </header>

      {tasks.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <KanbanBoard
          tasks={projectTasks}
          people={people}
          canManage={isManager}
          onOpenTask={setSelected}
        />
      )}

      <TaskDetailDialog
        task={activeTask}
        people={people}
        canManage={isManager}
        open={!!activeTask}
        onOpenChange={(next) => {
          if (!next) {
            setSelected(null);
            if (requestedTask) {
              void navigate({
                to: "/projects/$projectId",
                params: { projectId },
                search: { task: undefined },
                replace: true,
              });
            }
          }
        }}
        onEdit={() => {
          setEditing(activeTask);
          setSelected(null);
        }}
      />

      {editing ? (
        <TaskFormDialog
          projectId={projectId}
          projectName={project.name}
          assignees={assignees}
          task={editing}
          open={!!editing}
          onOpenChange={(next) => !next && setEditing(null)}
        />
      ) : null}
    </div>
  );
}
