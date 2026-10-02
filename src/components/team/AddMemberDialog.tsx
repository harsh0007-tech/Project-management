import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { qk } from "@/hooks/useTaskflow";
import type { Role } from "@/lib/types";

const MESSAGES: Record<string, string> = {
  ok: "Member added to the workspace.",
  invited: "Invitation saved. They'll join automatically when they sign up with that email.",
  not_allowed: "Only task managers can add members.",
  invalid_role: "Please choose a valid role.",
  already_member: "That person is already in this workspace.",
  already_invited: "That email already has a pending invitation.",
};

const ERROR_RESULTS = new Set(["not_allowed", "invalid_role", "already_member", "already_invited"]);

export function AddMemberDialog() {
  const { workspace } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("team_member");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspace) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("add_or_invite_member", {
      _ws: workspace.id,
      _email: email.trim(),
      _role: role,
    });
    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Unable to add the member. Please try again.");
      return;
    }
    const result = String(data);
    if (result === "ok" || result === "invited") {
      toast.success(MESSAGES[result]!);
      setEmail("");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: qk.members(workspace.id) });
      return;
    }
    if (ERROR_RESULTS.has(result)) {
      toast.error(MESSAGES[result] ?? "Unable to add the member.");
      return;
    }
    toast.error("Unable to add the member.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 size-4" aria-hidden />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
          <DialogDescription>
            Enter their email. If they don't have a TaskFlow account yet, they'll join automatically
            when they sign up with this email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="member-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="task_manager">Task Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
