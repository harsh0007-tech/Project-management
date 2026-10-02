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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { qk } from "@/hooks/useTaskflow";
import type { Project } from "@/lib/types";

interface Props {
  trigger?: ReactNode | undefined;
  project?: Project | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  onCreated?: ((projectId: string) => void) | undefined;
}

export function ProjectFormDialog({ trigger, project, open, onOpenChange, onCreated }: Props) {
  const { profile, workspace } = useAuth();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStartDate(project?.start_date ?? "");
    setDueDate(project?.due_date ?? "");
  }, [isOpen, project]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required.");
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      toast.error("Deadline cannot be before the start date.");
      return;
    }
    if (!workspace || !profile) return;

    setSaving(true);
    try {
      if (project) {
        const { error } = await supabase
          .from("projects")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            start_date: startDate || null,
            due_date: dueDate || null,
          })
          .eq("id", project.id);
        if (error) throw error;
        toast.success("Project updated successfully.");
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert({
            workspace_id: workspace.id,
            name: name.trim(),
            description: description.trim() || null,
            start_date: startDate || null,
            due_date: dueDate || null,
            created_by: profile.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        await supabase.from("project_members").insert({ project_id: data.id, user_id: profile.id });
        toast.success("Project created successfully.");
        onCreated?.(data.id);
      }
      await queryClient.invalidateQueries({ queryKey: qk.projects(workspace.id) });
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        project
          ? "Unable to update project. Please try again."
          : "Unable to create project. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "Create project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update the project details." : "Set up a new project for your team."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-start">Start date</Label>
              <Input
                id="project-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-due">Deadline</Label>
              <Input
                id="project-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
