import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity, notify, qk } from "@/hooks/useTaskflow";
import type { Profile, Task, TaskPriority, TaskStatus } from "@/lib/types";

interface Props {
  projectId: string;
  projectName?: string | undefined;
  assignees: Profile[];
  task?: Task | undefined;
  trigger?: ReactNode | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

const UNASSIGNED = "unassigned";

export function TaskFormDialog({
  projectId,
  projectName,
  assignees,
  task,
  trigger,
  open,
  onOpenChange,
}: Props) {
  const { profile, workspace } = useAuth();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssignedTo(task?.assigned_to ?? UNASSIGNED);
    setPriority(task?.priority ?? "medium");
    setStatus(task?.status ?? "todo");
    setDueDate(task?.due_date ?? "");
  }, [isOpen, task]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required.");
      return;
    }
    if (!dueDate) {
      toast.error("A due date is required.");
      return;
    }
    if (!profile) return;

    const assignee = assignedTo === UNASSIGNED ? null : assignedTo;
    setSaving(true);
    try {
      if (task) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            assigned_to: assignee,
            priority,
            status,
            due_date: dueDate,
          })
          .eq("id", task.id);
        if (error) throw error;
        await logActivity({
          workspaceId: workspace?.id ?? null,
          userId: profile.id,
          taskId: task.id,
          action: `updated task "${title.trim()}"`,
        });
        if (assignee && assignee !== task.assigned_to) {
          await notify({
            userId: assignee,
            selfId: profile.id,
            type: "task_assigned",
            message: `${profile.name} assigned you "${title.trim()}"`,
            taskId: task.id,
          });
        }
        toast.success("Task updated successfully.");
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            project_id: projectId,
            title: title.trim(),
            description: description.trim() || null,
            assigned_to: assignee,
            created_by: profile.id,
            priority,
            status,
            due_date: dueDate,
          })
          .select("id")
          .single();
        if (error) throw error;
        await logActivity({
          workspaceId: workspace?.id ?? null,
          userId: profile.id,
          taskId: data.id,
          action: `created task "${title.trim()}"`,
        });
        if (assignee) {
          await notify({
            userId: assignee,
            selfId: profile.id,
            type: "task_assigned",
            message: `${profile.name} assigned you "${title.trim()}"`,
            taskId: data.id,
          });
        }
        toast.success("Task created successfully.");
      }
      await queryClient.invalidateQueries({ queryKey: qk.tasks(workspace?.id) });
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Unable to save the task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {projectName ? `In ${projectName}` : "Add the task details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {assignees.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as TaskPriority)}
              >
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                <SelectTrigger id="task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
