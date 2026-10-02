CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_messages_content_not_blank CHECK (length(btrim(content)) > 0),
  CONSTRAINT direct_messages_distinct_participants CHECK (sender_id <> recipient_id)
);

GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view their direct messages"
ON public.direct_messages
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id)
  AND (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "Workspace members can send direct messages"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_id <> recipient_id
  AND public.is_workspace_member(workspace_id)
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members recipient_membership
    WHERE recipient_membership.workspace_id = direct_messages.workspace_id
      AND recipient_membership.user_id = direct_messages.recipient_id
  )
);

CREATE POLICY "Recipients can mark direct messages as read"
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (
  recipient_id = auth.uid()
  AND public.is_workspace_member(workspace_id)
)
WITH CHECK (
  recipient_id = auth.uid()
  AND public.is_workspace_member(workspace_id)
  AND sender_id <> recipient_id
);

CREATE TRIGGER t_direct_messages_updated
BEFORE UPDATE ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX direct_messages_conversation_idx
ON public.direct_messages (workspace_id, sender_id, recipient_id, created_at);

CREATE INDEX direct_messages_recipient_idx
ON public.direct_messages (workspace_id, recipient_id, read_at, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;