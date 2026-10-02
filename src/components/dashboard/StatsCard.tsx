import type { LucideIcon } from "lucide-react";

export function StatsCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  loading?: boolean | undefined;
}) {
  return (
    <div className="glass-panel flex items-center gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <div className="mt-1 h-6 w-10 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        )}
      </div>
    </div>
  );
}
