import { format, isToday, isTomorrow, isPast, parseISO, formatDistanceToNow } from "date-fns";

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    return parseISO(value.length > 10 ? value : `${value}T00:00:00`);
  } catch {
    return null;
  }
}

export function formatDate(value?: string | null): string {
  const d = parseDate(value);
  return d ? format(d, "MMM d, yyyy") : "—";
}

export function friendlyDate(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return "No date";
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d, yyyy");
}

export function isOverdue(value?: string | null): boolean {
  const d = parseDate(value);
  if (!d) return false;
  return isPast(d) && !isToday(d);
}

export function isDueToday(value?: string | null): boolean {
  const d = parseDate(value);
  return d ? isToday(d) : false;
}

export function timeAgo(value?: string | null): string {
  const d = parseDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "";
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function progressOf(tasks: { status: string }[]): {
  percent: number;
  done: number;
  total: number;
} {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  return { percent: total === 0 ? 0 : Math.round((done / total) * 100), done, total };
}
