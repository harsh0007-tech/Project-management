import { createFileRoute } from "@tanstack/react-router";
import { Mail, Users } from "lucide-react";

import { AddMemberDialog } from "@/components/team/AddMemberDialog";
import { EmptyState, UserAvatar } from "@/components/taskflow/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceMembers } from "@/hooks/useTaskflow";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — TaskFlow" },
      {
        name: "description",
        content: "View the people in your TaskFlow workspace and their roles.",
      },
      { property: "og:title", content: "Team — TaskFlow" },
      { property: "og:description", content: "View your workspace members and roles." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { workspace, isManager } = useAuth();
  const members = useWorkspaceMembers(workspace?.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone with access to {workspace?.name ?? "this workspace"}.
          </p>
        </div>
        {isManager ? <AddMemberDialog /> : null}
      </header>

      {members.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : members.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.data.map((member) => (
            <article key={member.id} className="glass-panel flex items-center gap-4 p-5">
              <UserAvatar name={member.profile?.name ?? null} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">
                  {member.profile?.name ?? "Team member"}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  {member.profile?.email ?? "No email available"}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {member.role === "task_manager" ? "Task Manager" : "Team Member"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="size-8" aria-hidden />}
          title="No team members yet"
          description="Add someone by email after they create a TaskFlow account."
        />
      )}
    </div>
  );
}
