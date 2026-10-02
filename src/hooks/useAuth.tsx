import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Profile, Role, Workspace } from "@/lib/types";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  workspace: Workspace | null;
  role: Role;
  isManager: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function bootstrap(
  user: User,
): Promise<{ profile: Profile | null; workspace: Workspace | null; role: Role }> {
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const desiredRole: Role = meta["role"] === "task_manager" ? "task_manager" : "team_member";

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name: meta["full_name"] || user.email?.split("@")[0] || "Member",
        email: user.email ?? "",
        role: desiredRole,
      })
      .select("*")
      .single();
    profile = created;
  }

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, joined_at, workspaces(id, name, owner_id)")
    .eq("user_id", user.id)
    // When a member is invited to a team, that membership is newer than the
    // personal workspace created during signup. Use the newest membership as
    // the active workspace so assigned work is visible immediately.
    .order("joined_at", { ascending: false });

  if (!memberships || memberships.length === 0) {
    const { data: ws } = await supabase
      .from("workspaces")
      .insert({
        name: meta["workspace_name"] || `${(profile?.name ?? "My").split(" ")[0]}'s Workspace`,
        owner_id: user.id,
      })
      .select("id, name, owner_id")
      .single();

    if (ws) {
      await supabase
        .from("workspace_members")
        .insert({ workspace_id: ws.id, user_id: user.id, role: desiredRole });
      return { profile: profile as Profile, workspace: ws as Workspace, role: desiredRole };
    }
    return { profile: profile as Profile, workspace: null, role: desiredRole };
  }

  const first = memberships[0] as unknown as {
    role: Role;
    workspaces: Workspace | null;
  };
  return {
    profile: profile as Profile,
    workspace: first.workspaces ?? null,
    role: first.role ?? desiredRole,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<Role>("team_member");

  const load = useCallback(async (current: Session | null) => {
    if (!current?.user) {
      setProfile(null);
      setWorkspace(null);
      setLoading(false);
      return;
    }
    try {
      const result = await bootstrap(current.user);
      setProfile(result.profile);
      setWorkspace(result.workspace);
      setRole(result.role);
    } catch (error) {
      console.error("bootstrap failed", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setWorkspace(null);
        setLoading(false);
        return;
      }
      if (nextSession?.user) {
        setTimeout(() => {
          void load(nextSession);
        }, 0);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void load(data.session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [load]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setWorkspace(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      workspace,
      role,
      // The workspace owner manages it even if their membership row still
      // carries the default team_member role from signup.
      isManager:
        role === "task_manager" ||
        (!!workspace && !!session?.user && workspace.owner_id === session.user.id),
      refreshProfile,
      signOut,
    }),
    [loading, session, profile, workspace, role, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
