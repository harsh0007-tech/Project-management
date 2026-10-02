import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, useTasks, useWorkspaceMembers } from "@/hooks/useTaskflow";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { data: projects = [] } = useProjects(workspace?.id);
  const { data: tasks = [] } = useTasks(workspace?.id);
  const { data: members = [] } = useWorkspaceMembers(workspace?.id);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass flex h-10 w-full max-w-md items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Search projects, tasks and people"
      >
        <Search className="size-4" aria-hidden />
        <span className="truncate">Search projects, tasks, people...</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, tasks, people..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {projects.length > 0 ? (
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project ${project.name}`}
                  onSelect={() => {
                    setOpen(false);
                    void navigate({
                      to: "/projects/$projectId",
                      params: { projectId: project.id },
                      search: { task: undefined },
                    });
                  }}
                >
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {tasks.length > 0 ? (
            <CommandGroup heading="Tasks">
              {tasks.slice(0, 30).map((task) => (
                <CommandItem
                  key={task.id}
                  value={`task ${task.title}`}
                  onSelect={() => {
                    setOpen(false);
                    void navigate({
                      to: "/projects/$projectId",
                      params: { projectId: task.project_id },
                      search: { task: task.id },
                    });
                  }}
                >
                  <span>{task.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{task.projects?.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {members.length > 0 ? (
            <CommandGroup heading="People">
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`person ${member.profile?.name ?? ""}`}
                  onSelect={() => {
                    setOpen(false);
                    void navigate({ to: "/team" });
                  }}
                >
                  {member.profile?.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
