import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ListTodo } from "lucide-react";

import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { EmptyState } from "@/components/taskflow/ui-bits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, useWorkspaceMembers } from "@/hooks/useTaskflow";
import type { Profile, Task, TaskPriority, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "My Tasks — TaskFlow" },
      {
        name: "description",
        content: "Every task assigned to you, filtered by status and priority.",
      },
      { property: "og:title", content: "My Tasks — TaskFlow" },
      { property: "og:description", content: "Every task assigned to you in one list." },
    ],
  }),
  component: MyTasksPage,
});

function MyTasksPage() {
  const { profile, workspace, isManager } = useAuth();
  const tasks = useTasks(workspace?.id);
  const members = useWorkspaceMembers(workspace?.id);
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [selected, setSelected] = useState<Task | null>(null);

  const people = useMemo(
    () => (members.data ?? []).map((member) => member.profile).filter(Boolean) as Profile[],
    [members.data],
  );

  const mine = (tasks.data ?? [])
    .filter((task) => task.assigned_to === profile?.id)
    .filter((task) => status === "all" || task.status === status)
    .filter((task) => priority === "all" || task.priority === priority)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Work assigned to you across all projects.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="w-40">
          <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus | "all")}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as TaskPriority | "all")}
          >
            <SelectTrigger aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tasks.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : mine.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assignee={people.find((person) => person.id === task.assigned_to) ?? null}
              onOpen={() => setSelected(task)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListTodo className="size-8" aria-hidden />}
          title="No tasks here"
          description="Nothing matches these filters right now."
        />
      )}

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
