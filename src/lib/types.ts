export type Role = "task_manager" | "team_member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  profile?: Profile | null;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  profile?: Profile | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  deadline_alert_sent_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  related_task_id: string | null;
  read: boolean;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  workspace_id: string | null;
  user_id: string;
  task_id: string | null;
  action: string;
  created_at: string;
  profile?: Profile | null;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};
