import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityLog,
  Comment,
  DirectMessage,
  Notification,
  Profile,
  Project,
  ProjectMember,
  Task,
  TaskStatus,
  WorkspaceMember,
} from "@/lib/types";

export type TaskWithProject = Task & {
  projects?: { id: string; name: string; workspace_id: string } | null;
};

export const qk = {
  members: (ws?: string) => ["workspace-members", ws] as const,
  projects: (ws?: string) => ["projects", ws] as const,
  tasks: (ws?: string) => ["tasks", ws] as const,
  projectMembers: (id?: string) => ["project-members", id] as const,
  comments: (id?: string) => ["comments", id] as const,
  activity: (id?: string) => ["activity", id] as const,
  notifications: (id?: string) => ["notifications", id] as const,
  projectMemberCounts: (ws?: string) => ["workspace-project-member-counts", ws] as const,
  directMessages: (workspaceId?: string, userId?: string, otherUserId?: string) =>
    ["direct-messages", workspaceId, userId, otherUserId] as const,
  directMessageUnread: (workspaceId?: string, userId?: string) =>
    ["direct-message-unread", workspaceId, userId] as const,
};

export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: qk.members(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, workspace_id, user_id, role, joined_at, profiles(*)")
        .eq("workspace_id", workspaceId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { profiles, ...rest } = row as unknown as WorkspaceMember & {
          profiles: Profile | null;
        };
        return { ...rest, profile: profiles };
      });
    },
  });
}

export function useProjects(workspaceId?: string) {
  return useQuery({
    queryKey: qk.projects(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
}

export function useTasks(workspaceId?: string) {
  return useQuery({
    queryKey: qk.tasks(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<TaskWithProject[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects!inner(id, name, workspace_id)")
        .eq("projects.workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TaskWithProject[];
    },
  });
}

export function useProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: qk.projectMembers(projectId),
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectMember[]> => {
      const { data, error } = await supabase
        .from("project_members")
        .select("id, project_id, user_id, profiles(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { profiles, ...rest } = row as unknown as ProjectMember & {
          profiles: Profile | null;
        };
        return { ...rest, profile: profiles };
      });
    },
  });
}

export function useWorkspaceProjectMemberCounts(workspaceId?: string) {
  return useQuery({
    queryKey: qk.projectMemberCounts(workspaceId),
    enabled: !!workspaceId,
    queryFn: async (): Promise<Record<string, number>> => {
      const currentWorkspaceId = workspaceId;
      if (!currentWorkspaceId) return {};

      const { data, error } = await supabase
        .from("project_members")
        .select("user_id, projects!inner(workspace_id)")
        .eq("projects.workspace_id", currentWorkspaceId);
      if (error) throw error;

      return (data ?? []).reduce<Record<string, number>>((counts, row) => {
        const userId = (row as unknown as { user_id: string }).user_id;
        counts[userId] = (counts[userId] ?? 0) + 1;
        return counts;
      }, {});
    },
  });
}

export function useComments(taskId?: string) {
  return useQuery({
    queryKey: qk.comments(taskId),
    enabled: !!taskId,
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, task_id, user_id, content, created_at, profiles(*)")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { profiles, ...rest } = row as unknown as Comment & { profiles: Profile | null };
        return { ...rest, profile: profiles };
      });
    },
  });
}

export function useActivity(taskId?: string) {
  return useQuery({
    queryKey: qk.activity(taskId),
    enabled: !!taskId,
    queryFn: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, workspace_id, user_id, task_id, action, created_at, profiles(*)")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { profiles, ...rest } = row as unknown as ActivityLog & { profiles: Profile | null };
        return { ...rest, profile: profiles };
      });
    },
  });
}

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: qk.notifications(userId),
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

export function useDirectMessages(workspaceId?: string, userId?: string, otherUserId?: string) {
  const queryClient = useQueryClient();
  const queryKey = qk.directMessages(workspaceId, userId, otherUserId);

  const query = useQuery({
    queryKey,
    enabled: !!workspaceId && !!userId && !!otherUserId,
    queryFn: async (): Promise<DirectMessage[]> => {
      if (!workspaceId || !userId || !otherUserId) return [];
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DirectMessage[];
    },
  });

  useEffect(() => {
    if (!workspaceId || !userId || !otherUserId) return;

    const channel = supabase
      .channel(`direct-messages-${workspaceId}-${userId}-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId, queryClient, queryKey, userId, workspaceId]);

  return query;
}

export function useUnreadDirectMessageCounts(workspaceId?: string, userId?: string) {
  const queryClient = useQueryClient();
  const queryKey = qk.directMessageUnread(workspaceId, userId);

  const query = useQuery({
    queryKey,
    enabled: !!workspaceId && !!userId,
    queryFn: async (): Promise<Record<string, number>> => {
      if (!workspaceId || !userId) return {};
      const { data, error } = await supabase
        .from("direct_messages")
        .select("sender_id")
        .eq("workspace_id", workspaceId)
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (error) throw error;
      return (data ?? []).reduce<Record<string, number>>((counts, row) => {
        const senderId = (row as { sender_id: string }).sender_id;
        counts[senderId] = (counts[senderId] ?? 0) + 1;
        return counts;
      }, {});
    },
  });

  useEffect(() => {
    if (!workspaceId || !userId) return;

    const channel = supabase
      .channel(`direct-message-unread-${workspaceId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey, userId, workspaceId]);

  return query;
}

export function useSendDirectMessage(workspaceId?: string, userId?: string, otherUserId?: string) {
  const queryClient = useQueryClient();
  const queryKey = qk.directMessages(workspaceId, userId, otherUserId);

  return useMutation({
    mutationFn: async (content: string) => {
      if (!workspaceId || !userId || !otherUserId) throw new Error("Select a teammate first");
      const { error } = await supabase.from("direct_messages").insert({
        workspace_id: workspaceId,
        sender_id: userId,
        recipient_id: otherUserId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useMarkDirectMessagesRead(
  workspaceId?: string,
  userId?: string,
  otherUserId?: string,
) {
  const queryClient = useQueryClient();
  const queryKey = qk.directMessages(workspaceId, userId, otherUserId);

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId || !userId || !otherUserId) return;
      const { error } = await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("sender_id", otherUserId)
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: qk.directMessageUnread(workspaceId, userId),
      });
    },
  });
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useDeadlineNotifications(userId?: string, workspaceId?: string) {
  const queryClient = useQueryClient();
  const tasks = useTasks(workspaceId);
  const inFlightTaskIds = useRef(new Set<string>());

  useEffect(() => {
    if (!userId || !workspaceId || tasks.isLoading || !tasks.data?.length) return;

    const today = new Date();
    const todayKey = localDateKey(today);
    today.setDate(today.getDate() + 1);
    const tomorrowKey = localDateKey(today);
    const candidates = tasks.data.filter(
      (task) =>
        task.assigned_to === userId &&
        task.status !== "done" &&
        (task.due_date === todayKey || task.due_date === tomorrowKey) &&
        task.deadline_alert_sent_for !== task.due_date &&
        !inFlightTaskIds.current.has(task.id),
    );

    if (!candidates.length) return;
    let cancelled = false;
    candidates.forEach((task) => inFlightTaskIds.current.add(task.id));

    void Promise.all(
      candidates.map(async (task) => {
        const isToday = task.due_date === todayKey;
        const remaining = isToday ? "less than 24 hours remaining" : "about 24 hours remaining";
        const { error: notificationError } = await supabase.from("notifications").insert({
          user_id: userId,
          type: "deadline_approaching",
          message: `Deadline reminder: “${task.title}” is due ${isToday ? "today" : "tomorrow"} — ${remaining}.`,
          related_task_id: task.id,
        });
        if (notificationError) throw notificationError;

        const { error: taskError } = await supabase
          .from("tasks")
          .update({ deadline_alert_sent_for: task.due_date })
          .eq("id", task.id)
          .eq("assigned_to", userId);
        if (taskError) throw taskError;
      }),
    )
      .then(() => {
        if (cancelled) return;
        void queryClient.invalidateQueries({ queryKey: qk.notifications(userId) });
        void queryClient.invalidateQueries({ queryKey: qk.tasks(workspaceId) });
      })
      .catch((error) => {
        if (!cancelled) console.error("deadline notification failed", error);
      })
      .finally(() => {
        candidates.forEach((task) => inFlightTaskIds.current.delete(task.id));
      });

    return () => {
      cancelled = true;
    };
  }, [queryClient, tasks.data, tasks.isLoading, userId, workspaceId]);
}

export async function notify(input: {
  userId: string;
  type: string;
  message: string;
  taskId?: string | null;
  selfId?: string;
}) {
  if (input.selfId && input.selfId === input.userId) return;
  await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    message: input.message,
    related_task_id: input.taskId ?? null,
  });
}

export async function logActivity(input: {
  workspaceId?: string | null;
  userId: string;
  taskId?: string | null;
  action: string;
}) {
  if (!input.workspaceId) return;
  await supabase.from("activity_logs").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    task_id: input.taskId ?? null,
    action: input.action,
  });
}

export function useUpdateTaskStatus(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: qk.tasks(workspaceId) });
      const previous = queryClient.getQueryData<TaskWithProject[]>(qk.tasks(workspaceId));
      queryClient.setQueryData<TaskWithProject[]>(qk.tasks(workspaceId), (old) =>
        (old ?? []).map((task) => (task.id === taskId ? { ...task, status } : task)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(qk.tasks(workspaceId), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tasks(workspaceId) });
    },
  });
}
