import { Link } from "@tanstack/react-router";
import { CalendarDays, ListChecks } from "lucide-react";

import { ProgressBar } from "@/components/taskflow/ui-bits";
import { formatDate, progressOf } from "@/lib/format";
import type { Project, Task } from "@/lib/types";

export function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const progress = progressOf(tasks);
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      search={{ task: undefined }}
      className="glass-panel block p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <h3 className="text-base font-semibold">{project.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {project.description || "No description"}
      </p>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.done} of {progress.total} tasks done
          </span>
          <span className="font-medium text-foreground">{progress.percent}%</span>
        </div>
        <ProgressBar percent={progress.percent} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ListChecks className="size-3.5" aria-hidden />
          {progress.total} tasks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden />
          {project.due_date ? `Due ${formatDate(project.due_date)}` : "No deadline"}
        </span>
      </div>
    </Link>
  );
}
