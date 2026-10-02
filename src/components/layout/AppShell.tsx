import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { UserAvatar } from "@/components/taskflow/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeadlineNotifications,
  useNotifications,
  useWorkspaceMembers,
} from "@/hooks/useTaskflow";
import { supabase } from "@/integrations/supabase/client";
import type { DirectMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TasksIcon = CheckSquare;

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "My Tasks", icon: TasksIcon },
  { to: "/team", label: "Team", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/messages", label: "Messages", icon: MessageCircle },
] as const;

function NavList({
  collapsed,
  unread,
  onNavigate,
}: {
  collapsed: boolean;
  unread: number;
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_var(--color-primary)]/10"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {item.label === "Notifications" && unread > 0 && (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  collapsed,
  unread,
  onNavigate,
}: {
  collapsed: boolean;
  unread: number;
  onNavigate?: (() => void) | undefined;
}) {
  const { profile, workspace, role } = useAuth();

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
          <CheckSquare className="size-5" aria-hidden />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">TaskFlow</p>
            <p className="truncate text-xs text-muted-foreground">
              {workspace?.name ?? "Workspace"}
            </p>
          </div>
        )}
      </div>

      <NavList collapsed={collapsed} unread={unread} onNavigate={onNavigate} />

      <div className="space-y-1 border-t border-border pt-3">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <Settings className="size-4" aria-hidden />
          {!collapsed && "Settings"}
        </Link>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <UserAvatar name={profile?.name ?? null} size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {role === "task_manager" ? "Task Manager" : "Team Member"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, workspace, role, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotifications(profile?.id);
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspace?.id);
  useDeadlineNotifications(role === "team_member" ? profile?.id : undefined, workspace?.id);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const workspaceId = workspace?.id;
    const userId = profile?.id;
    if (!workspaceId || !userId) return;

    const channel = supabase
      .channel(`incoming-message-popups-${workspaceId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const message = payload.new as Partial<DirectMessage>;
          if (
            message.sender_id === userId ||
            message.recipient_id !== userId ||
            !message.content
          ) {
            return;
          }

          const senderName =
            workspaceMembers.find((member) => member.user_id === message.sender_id)?.profile?.name ??
            "A teammate";

          toast(`New message from ${senderName}`, {
            description: message.content,
            duration: 7000,
            action: {
              label: "Open messages",
              onClick: () => void navigate({ to: "/messages" }),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, profile?.id, workspace?.id, workspaceMembers]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "glass sticky top-0 hidden h-screen shrink-0 border-y-0 border-l-0 transition-[width] duration-300 lg:block",
          collapsed ? "w-[84px]" : "w-[264px]",
        )}
      >
        <SidebarBody collapsed={collapsed} unread={unread} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-x-0 border-t-0 px-4 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[272px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody
                collapsed={false}
                unread={unread}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </Button>

          <div className="flex-1">
            <GlobalSearch />
          </div>

          <Link
            to="/notifications"
            className="relative grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
          >
            <Bell className="size-5" aria-hidden />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unread}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label="Account menu"
              >
                <UserAvatar name={profile?.name ?? null} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="truncate">{profile?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void navigate({ to: "/settings" })}>
                <Settings className="mr-2 size-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleSignOut()}>
                <LogOut className="mr-2 size-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
