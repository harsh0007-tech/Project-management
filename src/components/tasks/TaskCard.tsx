import { CalendarDays } from "lucide-react";

import { PriorityBadge, UserAvatar } from "@/components/taskflow/ui-bits";
import { friendlyDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile, Task } from "@/lib/types";

export function TaskCard({
  task,
  assignee,
  onOpen,
  className,
}: {
  task: Task;
  assignee?: Profile | null | undefined;
  onOpen?: (() => void) | undefined;
  className?: string | undefined;
}) {
  const overdue = isOverdue(task.due_date) && task.status !== "done";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "surface w-full space-y-3 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <p className="text-sm leading-snug font-semibold">{task.title}</p>
      {task.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            overdue ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          <CalendarDays className="size-3.5" aria-hidden />
          {friendlyDate(task.due_date)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserAvatar name={assignee?.name ?? null} size="sm" />
        {assignee?.name ?? "Unassigned"}
      </div>
    </button>
  );
}
