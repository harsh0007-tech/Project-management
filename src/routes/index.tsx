import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckSquare, KanbanSquare, Bell, Users, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskFlow — Simple project & task management" },
      {
        name: "description",
        content:
          "TaskFlow helps small teams plan projects, assign tasks and track progress on a clean Kanban board.",
      },
      { property: "og:title", content: "TaskFlow — Simple project & task management" },
      {
        property: "og:description",
        content: "Plan projects, assign tasks and track progress with your team.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: KanbanSquare,
    title: "Kanban that stays simple",
    description:
      "Three clear columns — To Do, In Progress, Done. Drag a card and everyone sees the update.",
  },
  {
    icon: Users,
    title: "Two roles, zero confusion",
    description: "Task managers plan and assign. Team members focus on the work that's theirs.",
  },
  {
    icon: Bell,
    title: "Never miss a handoff",
    description: "Assignments, comments and completions land in your notification list right away.",
  },
];

function Landing() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="inline-flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CheckSquare className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">TaskFlow</span>
        </span>
        <nav className="flex items-center gap-2">
          {session ? (
            <Button asChild>
              <Link to="/dashboard">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="glass-panel mt-6 px-6 py-16 text-center sm:px-12 sm:py-24">
          <p className="mx-auto w-fit rounded-full border border-border bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Project & task management for small teams
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
            Plan the work. Track the progress. Ship it.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            TaskFlow gives your team a clean home for projects, tasks and deadlines — without the
            setup cost of heavy tools.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to={session ? "/dashboard" : "/signup"}>
                {session ? "Go to dashboard" : "Create free account"}
                <ArrowRight className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
            {!session ? (
              <Button asChild size="lg" variant="outline">
                <Link to="/login">I already have an account</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="glass-panel p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        TaskFlow — organized work for growing teams.
      </footer>
    </div>
  );
}
