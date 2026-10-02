import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — TaskFlow" },
      {
        name: "description",
        content: "Create a TaskFlow workspace and start organizing projects and tasks in minutes.",
      },
      { property: "og:title", content: "Create your account — TaskFlow" },
      { property: "og:description", content: "Create a TaskFlow workspace in minutes." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState<Role>("task_manager");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!workspaceName.trim()) {
      toast.error("Workspace name is required.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          workspace_name: workspaceName.trim(),
          role,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("registered")
          ? "That email is already registered. Try signing in."
          : "Unable to create your account. Please try again.",
      );
      return;
    }

    if (!data.session) {
      toast.success("Account created. You can sign in now.");
      void navigate({ to: "/login" });
      return;
    }

    toast.success("Welcome to TaskFlow!");
    void navigate({ to: "/dashboard", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-lg p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CheckSquare className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">TaskFlow</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A simple workspace for teams to get work done.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace name</Label>
            <Input
              id="workspace"
              required
              placeholder="Acme Team"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Role</legend>
            <RadioGroup
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label className="surface flex cursor-pointer items-center gap-3 p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="task_manager" id="role-manager" />
                <span>
                  <span className="block font-medium">Task Manager</span>
                  <span className="text-xs text-muted-foreground">
                    Create projects and assign work
                  </span>
                </span>
              </label>
              <label className="surface flex cursor-pointer items-center gap-3 p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="team_member" id="role-member" />
                <span>
                  <span className="block font-medium">Team Member</span>
                  <span className="text-xs text-muted-foreground">Work on assigned tasks</span>
                </span>
              </label>
            </RadioGroup>
          </fieldset>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
