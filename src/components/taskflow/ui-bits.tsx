import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { PRIORITY_LABEL, STATUS_LABEL, type TaskPriority, type TaskStatus } from "@/lib/types";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const styles: Record<TaskPriority, string> = {
    high: "bg-destructive/10 text-destructive border-destructive/25",
    medium: "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning",
    low: "bg-success/12 text-success border-success/25",
  };
  const dot: Record<TaskPriority, string> = {
    high: "bg-destructive",
    medium: "bg-warning",
    low: "bg-success",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[priority],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot[priority])} aria-hidden />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const styles: Record<TaskStatus, string> = {
    todo: "bg-muted text-muted-foreground border-border",
    in_progress: "bg-primary/10 text-primary border-primary/25",
    done: "bg-success/12 text-success border-success/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const safePercent = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ transform: `scaleX(${safePercent / 100})`, transformOrigin: "left" }}
      />
    </div>
  );
}

export function UserAvatar({
  name,
  size = "md",
  className,
}: {
  name?: string | null | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
}) {
  const sizes = {
    sm: "size-6 text-[10px]",
    md: "size-8 text-xs",
    lg: "size-11 text-sm",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary ring-1 ring-primary/20",
        sizes[size],
        className,
      )}
      title={name ?? undefined}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode | undefined;
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="glass-panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn("glass-panel p-5", className)}>
      {title ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
