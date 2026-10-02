import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Loader2, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  logActivity,
  notify,
  qk,
  useActivity,
  useComments,
  useUpdateTaskStatus,
} from "@/hooks/useTaskflow";
import { PriorityBadge, UserAvatar } from "@/components/taskflow/ui-bits";
import { friendlyDate, isOverdue, timeAgo } from "@/lib/format";
import { STATUS_LABEL, type Profile, type Task, type TaskStatus } from "@/lib/types";

interface Props {
  task: Task | null;
  people: Profile[];
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (() => void) | undefined;
}

export function TaskDetailDialog({ task, people, canManage, open, onOpenChange, onEdit }: Props) {
  const { profile, workspace } = useAuth();
  const queryClient = useQueryClient();
  const comments = useComments(task?.id);
  const activity = useActivity(task?.id);
  const updateStatus = useUpdateTaskStatus(workspace?.id);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!task) return null;

  const assignee = people.find((person) => person.id === task.assigned_to) ?? null;
  const canChangeStatus = canManage || task.assigned_to === profile?.id;

  const changeStatus = async (status: TaskStatus) => {
    if (!profile) return;
    try {
      await updateStatus.mutateAsync({ taskId: task.id, status });
      await logActivity({
        workspaceId: workspace?.id ?? null,
        userId: profile.id,
        taskId: task.id,
        action: `moved "${task.title}" to ${STATUS_LABEL[status]}`,
      });
      if (status === "done") {
        await notify({
          userId: task.created_by,
          selfId: profile.id,
          type: "task_completed",
          message: `${profile.name} completed "${task.title}"`,
          taskId: task.id,
        });
      }
      void activity.refetch();
      toast.success("Task status updated.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the status. Please try again.");
    }
  };

  const postComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim() || !profile) return;
    setPosting(true);
    const { error } = await supabase
      .from("comments")
      .insert({ task_id: task.id, user_id: profile.id, content: comment.trim() });
    setPosting(false);
    if (error) {
      console.error(error);
      toast.error("Unable to post the comment. Please try again.");
      return;
    }
    setComment("");
    void comments.refetch();
    await logActivity({
      workspaceId: workspace?.id ?? null,
      userId: profile.id,
      taskId: task.id,
      action: `commented on "${task.title}"`,
    });
    for (const userId of new Set([task.assigned_to, task.created_by].filter(Boolean) as string[])) {
      await notify({
        userId,
        selfId: profile.id,
        type: "comment",
        message: `${profile.name} commented on "${task.title}"`,
        taskId: task.id,
      });
    }
    void activity.refetch();
  };

  const removeTask = async () => {
    if (!window.confirm("Delete this task? This can't be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setDeleting(false);
    if (error) {
      toast.error("Unable to delete the task. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: qk.tasks(workspace?.id) });
    toast.success("Task deleted.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-xl">{task.title}</DialogTitle>
          <DialogDescription>Task details, status, comments and history.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <PriorityBadge priority={task.priority} />
            <span
              className={`inline-flex items-center gap-1.5 text-sm ${
                isOverdue(task.due_date) && task.status !== "done"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              <CalendarDays className="size-4" aria-hidden />
              Due {friendlyDate(task.due_date)}
            </span>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <UserAvatar name={assignee?.name ?? null} size="sm" />
              {assignee?.name ?? "Unassigned"}
            </span>
          </div>

          {task.description ? (
            <p className="text-sm whitespace-pre-line text-foreground/90">{task.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description provided.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <Select
                value={task.status}
                onValueChange={(value) => void changeStatus(value as TaskStatus)}
                disabled={!canChangeStatus}
              >
                <SelectTrigger aria-label="Task status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canManage ? (
              <>
                {onEdit ? (
                  <Button variant="outline" onClick={onEdit}>
                    Edit task
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={removeTask}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 size-4" aria-hidden />
                  )}
                  Delete
                </Button>
              </>
            ) : null}
          </div>

          <section>
            <h3 className="text-sm font-semibold">Comments</h3>
            <div className="mt-3 space-y-3">
              {comments.isLoading ? (
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
              ) : comments.data?.length ? (
                comments.data.map((item) => (
                  <div key={item.id} className="surface flex gap-3 p-3">
                    <UserAvatar name={item.profile?.name ?? null} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {item.profile?.name ?? "Someone"}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {timeAgo(item.created_at)}
                        </span>
                      </p>
                      <p className="text-sm whitespace-pre-line text-foreground/90">
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No comments yet. Start the conversation.
                </p>
              )}
            </div>

            <form onSubmit={postComment} className="mt-3 flex items-end gap-2">
              <Textarea
                aria-label="Write a comment"
                rows={2}
                placeholder="Write a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button type="submit" disabled={posting || !comment.trim()}>
                {posting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                <span className="sr-only">Post comment</span>
              </Button>
            </form>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Activity</h3>
            <ul className="mt-3 space-y-2">
              {activity.data?.length ? (
                activity.data.map((item) => (
                  <li key={item.id} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {item.profile?.name ?? "Someone"}
                    </span>{" "}
                    {item.action} · {timeAgo(item.created_at)}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No activity recorded yet.</li>
              )}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
