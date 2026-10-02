import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Laptop, Loader2, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type ThemeMode } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TaskFlow" },
      { name: "description", content: "Manage your TaskFlow profile, appearance and password." },
      { property: "og:title", content: "Settings — TaskFlow" },
      { property: "og:description", content: "Manage your TaskFlow profile and preferences." },
    ],
  }),
  component: SettingsPage,
});

const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !name.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Unable to update your profile.");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated.");
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      toast.error("The new password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    setSavingPassword(false);
    if (error) {
      toast.error("Unable to change your password. Check your current password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password changed.");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, appearance and account security.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-panel p-6">
          <h2 className="text-base font-semibold">Profile</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Full name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" value={profile?.email ?? ""} disabled />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save profile
            </Button>
          </form>
        </section>

        <section className="glass-panel p-6">
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how TaskFlow looks on this device.
          </p>
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as ThemeMode)}
            className="mt-4 grid gap-3 sm:grid-cols-3"
          >
            {themes.map((option) => (
              <label
                key={option.value}
                className="surface flex cursor-pointer items-center gap-2 p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value={option.value} />
                <option.icon className="size-4" aria-hidden />
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </section>

        <section className="glass-panel p-6 xl:col-span-2">
          <h2 className="text-base font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Change password
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
