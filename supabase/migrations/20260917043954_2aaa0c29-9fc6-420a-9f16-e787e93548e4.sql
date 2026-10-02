CREATE TABLE public.workspace_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'team_member',
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

GRANT SELECT, INSERT, DELETE ON public.workspace_invitations TO authenticated;
GRANT ALL ON public.workspace_invitations TO service_role;

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_invitations_select" ON public.workspace_invitations
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "ws_invitations_insert" ON public.workspace_invitations
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_manager(workspace_id) AND invited_by = auth.uid());

CREATE POLICY "ws_invitations_delete" ON public.workspace_invitations
  FOR DELETE TO authenticated
  USING (is_workspace_manager(workspace_id));

CREATE OR REPLACE FUNCTION public.add_or_invite_member(_ws uuid, _email text, _role text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid UUID;
BEGIN
  IF NOT public.is_workspace_manager(_ws) THEN
    RETURN 'not_allowed';
  END IF;
  IF _role NOT IN ('task_manager','team_member') THEN
    RETURN 'invalid_role';
  END IF;
  SELECT id INTO _uid FROM public.profiles WHERE lower(email) = lower(trim(_email));
  IF _uid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _ws AND user_id = _uid) THEN
      RETURN 'already_member';
    END IF;
    INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_ws, _uid, _role);
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (_uid, 'member_added', 'You were added to a workspace');
    RETURN 'ok';
  END IF;
  IF EXISTS (SELECT 1 FROM public.workspace_invitations WHERE workspace_id = _ws AND lower(email) = lower(trim(_email))) THEN
    RETURN 'already_invited';
  END IF;
  INSERT INTO public.workspace_invitations (workspace_id, email, role, invited_by)
  VALUES (_ws, lower(trim(_email)), _role, auth.uid());
  RETURN 'invited';
END;
$function$;

CREATE OR REPLACE FUNCTION public.fulfill_workspace_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE inv RECORD;
BEGIN
  FOR inv IN
    SELECT * FROM public.workspace_invitations WHERE lower(email) = lower(NEW.email)
  LOOP
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, NEW.id, inv.role)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (NEW.id, 'member_added', 'You were added to a workspace');
    DELETE FROM public.workspace_invitations WHERE id = inv.id;
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER t_profiles_fulfill_invitations
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fulfill_workspace_invitations();