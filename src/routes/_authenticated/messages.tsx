import { createFileRoute } from "@tanstack/react-router";

import { MessagesWorkspace } from "@/components/messages/MessagesWorkspace";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — TaskFlow" },
      { name: "description", content: "Message your team members and task managers." },
      { property: "og:title", content: "Messages — TaskFlow" },
      { property: "og:description", content: "Message your team from one focused workspace." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat privately with team members and task managers.
        </p>
      </header>
      <MessagesWorkspace />
    </div>
  );
}