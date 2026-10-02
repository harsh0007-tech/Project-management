import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { EmptyState, UserAvatar } from "@/components/taskflow/ui-bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useDirectMessages,
  useMarkDirectMessagesRead,
  useSendDirectMessage,
  useUnreadDirectMessageCounts,
  useWorkspaceMembers,
} from "@/hooks/useTaskflow";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessagesWorkspace() {
  const { profile, workspace } = useAuth();
  const members = useWorkspaceMembers(workspace?.id);
  const unreadCounts = useUnreadDirectMessageCounts(workspace?.id, profile?.id);
  const people = useMemo(
    () => (members.data ?? []).map((member) => member.profile).filter(Boolean) as Profile[],
    [members.data],
  );
  const contacts = useMemo(
    () => people.filter((person) => person.id !== profile?.id),
    [people, profile?.id],
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const selectedContact = contacts.find((person) => person.id === selectedContactId) ?? null;
  const messages = useDirectMessages(workspace?.id, profile?.id, selectedContactId ?? undefined);
  const sendMessage = useSendDirectMessage(
    workspace?.id,
    profile?.id,
    selectedContactId ?? undefined,
  );
  const markRead = useMarkDirectMessagesRead(
    workspace?.id,
    profile?.id,
    selectedContactId ?? undefined,
  );
  const markedUnreadIds = useRef("");

  useEffect(() => {
    if (!contacts.length) {
      setSelectedContactId(null);
      return;
    }
    if (!selectedContactId || !contacts.some((person) => person.id === selectedContactId)) {
      setSelectedContactId(contacts[0]?.id ?? null);
    }
  }, [contacts, selectedContactId]);

  useEffect(() => {
    const unreadIds =
      messages.data
        ?.filter((message) => message.recipient_id === profile?.id && !message.read_at)
        .map((message) => message.id)
        .join(",") ?? "";
    if (unreadIds && unreadIds !== markedUnreadIds.current) {
      markedUnreadIds.current = unreadIds;
      markRead.mutate();
    }
  }, [messages.data, markRead, profile?.id]);

  const handleSubmit = async ({ text }: { text: string }) => {
    const content = text.trim();
    if (!content || !selectedContactId) return;
    try {
      await sendMessage.mutateAsync(content);
    } catch {
      toast.error("Your message could not be sent.");
    }
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="grid h-[calc(100dvh-14rem)] min-h-[560px] md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 bg-muted/20 p-3 md:max-h-full md:overflow-y-auto md:border-b-0 md:border-r">
          <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <MessageCircle className="size-4" />
            Team
          </div>
          {contacts.length ? (
            <div className="flex gap-2 overflow-x-auto md:block md:space-y-1 md:overflow-visible">
              {contacts.map((person) => {
                const active = person.id === selectedContactId;
                const unread = unreadCounts.data?.[person.id] ?? 0;
                return (
                  <Button
                    key={person.id}
                    type="button"
                    variant={active ? "secondary" : "ghost"}
                    className="h-auto min-w-[180px] justify-start gap-3 px-2.5 py-2 text-left md:flex md:w-full"
                    onClick={() => setSelectedContactId(person.id)}
                  >
                    <UserAvatar name={person.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          unread > 0 ? "font-semibold" : "font-medium",
                        )}
                      >
                        {person.name}
                      </span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {person.role === "task_manager" ? "Task manager" : "Team member"}
                      </span>
                    </span>
                    {unread > 0 && (
                      <span
                        className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground"
                        aria-label={`${unread} unread message${unread === 1 ? "" : "s"} from ${person.name}`}
                      >
                        {unread}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No other teammates are available yet.
            </p>
          )}
        </aside>

        <div className="flex h-full min-h-0 min-w-0 flex-col">
          {selectedContact ? (
            <>
              <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
                <UserAvatar name={selectedContact.name} />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{selectedContact.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedContact.role === "task_manager" ? "Task manager" : "Team member"}
                  </p>
                </div>
              </header>

              <Conversation className="min-h-0 flex-1">
                <ConversationContent className="gap-3 p-4">
                  {messages.isLoading ? (
                    <div className="space-y-3 py-8 text-center text-sm text-muted-foreground">
                      Loading messages…
                    </div>
                  ) : messages.data?.length ? (
                    messages.data.map((message) => {
                      const isMine = message.sender_id === profile?.id;
                      return (
                        <Message
                          key={message.id}
                          from={isMine ? "user" : "assistant"}
                          className="max-w-[82%]"
                        >
                          <MessageContent
                            className={isMine ? "bg-primary text-primary-foreground" : undefined}
                          >
                            <MessageResponse>{message.content}</MessageResponse>
                            <span
                              className={
                                isMine
                                  ? "text-right text-[10px] text-primary-foreground/70"
                                  : "text-[10px] text-muted-foreground"
                              }
                            >
                              {format(new Date(message.created_at), "p")}
                            </span>
                          </MessageContent>
                        </Message>
                      );
                    })
                  ) : (
                    <ConversationEmptyState
                      icon={<MessageCircle className="size-8" />}
                      title="Start a conversation"
                      description={`Send a message to ${selectedContact.name}.`}
                    />
                  )}
                </ConversationContent>
                <ConversationScrollButton aria-label="Scroll to latest messages" />
              </Conversation>

              <div className="border-t border-border/70 p-3">
                <PromptInput onSubmit={handleSubmit}>
                  <PromptInputTextarea
                    aria-label={`Message ${selectedContact.name}`}
                    disabled={sendMessage.isPending}
                    placeholder={`Message ${selectedContact.name}…`}
                    rows={1}
                  />
                  <PromptInputFooter className="justify-end">
                    <PromptInputSubmit
                      aria-label="Send message"
                      disabled={sendMessage.isPending}
                      size="icon-sm"
                    >
                      <Send className="size-4" />
                    </PromptInputSubmit>
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<MessageCircle className="size-8" />}
              title="Choose a teammate"
              description="Select a team member or task manager to open your messages."
            />
          )}
        </div>
      </div>
    </div>
  );
}