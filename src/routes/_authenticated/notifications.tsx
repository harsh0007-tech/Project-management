import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/taskflow/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { qk, useNotifications, useTasks } from "@/hooks/useTaskflow";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — TaskFlow" },
      { name: "description", content: "Review task assignments, comments and completion updates." },
      { property: "og:title", content: "Notifications — TaskFlow" },
      {
        property: "og:description",
        content: "Review task assignments, comments and completion updates.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { profile, workspace } = useAuth();
  const queryClient = useQueryClient();
  const notifications = useNotifications(profile?.id);
  const tasks = useTasks(workspace?.id);
  const unread = (notifications.data ?? []).filter((item) => !item.read).length;

  const markAllRead = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
    if (error) {
      toast.error("Unable to mark notifications as read.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: qk.notifications(profile.id) });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    await queryClient.invalidateQueries({ queryKey: qk.notifications(profile?.id) });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread
              ? `${unread} unread update${unread === 1 ? "" : "s"}.`
              : "You're all caught up."}
          </p>
        </div>
        {unread ? (
          <Button variant="outline" onClick={() => void markAllRead()}>
            <CheckCheck className="mr-2 size-4" aria-hidden />
            Mark all read
          </Button>
        ) : null}
      </header>

      {notifications.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : notifications.data?.length ? (
        <div className="glass-panel divide-y divide-border overflow-hidden">
          {notifications.data.map((item) => {
            const task = tasks.data?.find((candidate) => candidate.id === item.related_task_id);
            const content = (
              <div className="flex gap-3 p-4 sm:p-5">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-border" : "bg-primary"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${item.read ? "text-muted-foreground" : "font-medium"}`}>
                    {item.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
                </div>
              </div>
            );

            return task ? (
              <Link
                key={item.id}
                to="/projects/$projectId"
                params={{ projectId: task.project_id }}
                search={{ task: task.id }}
                onClick={() => void markRead(item.id)}
                className="block transition-colors hover:bg-accent/40"
              >
                {content}
              </Link>
            ) : (
              <button
                type="button"
                key={item.id}
                onClick={() => void markRead(item.id)}
                className="block w-full text-left transition-colors hover:bg-accent/40"
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="size-8" aria-hidden />}
          title="No notifications"
          description="Assignments, comments and task updates will appear here."
        />
      )}
    </div>
  );
}
