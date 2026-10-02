ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deadline_alert_sent_for date;

CREATE UNIQUE INDEX IF NOT EXISTS project_members_project_user_unique
  ON public.project_members (project_id, user_id);

CREATE OR REPLACE FUNCTION public.enforce_team_member_project_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_id_value uuid;
  member_role text;
  project_count integer;
BEGIN
  SELECT p.workspace_id INTO workspace_id_value
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  SELECT wm.role INTO member_role
  FROM public.workspace_members wm
  WHERE wm.workspace_id = workspace_id_value
    AND wm.user_id = NEW.user_id;

  IF member_role = 'team_member' THEN
    SELECT count(*)::integer INTO project_count
    FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.user_id = NEW.user_id
      AND p.workspace_id = workspace_id_value;

    IF project_count >= 3 THEN
      RAISE EXCEPTION 'Team members can be added to a maximum of 3 projects.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_team_member_project_limit_trigger ON public.project_members;
CREATE TRIGGER enforce_team_member_project_limit_trigger
  BEFORE INSERT OR UPDATE OF project_id, user_id ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_team_member_project_limit();

CREATE OR REPLACE FUNCTION public.reset_deadline_alert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    NEW.deadline_alert_sent_for := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_deadline_alert_trigger ON public.tasks;
CREATE TRIGGER reset_deadline_alert_trigger
  BEFORE UPDATE OF due_date ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_deadline_alert();

CREATE OR REPLACE FUNCTION public.create_deadline_notification(_task uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_row public.tasks%ROWTYPE;
  project_workspace_id uuid;
  remaining_label text;
BEGIN
  SELECT t.* INTO task_row
  FROM public.tasks t
  WHERE t.id = _task
  FOR UPDATE;

  IF task_row.id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.workspace_id INTO project_workspace_id
  FROM public.projects p
  WHERE p.id = task_row.project_id;

  IF NOT public.can_view_project(task_row.project_id)
     OR task_row.assigned_to IS NULL
     OR task_row.due_date > CURRENT_DATE + 1
     OR task_row.due_date < CURRENT_DATE
     OR task_row.deadline_alert_sent_for IS NOT DISTINCT FROM task_row.due_date THEN
    RETURN false;
  END IF;

  IF task_row.due_date = CURRENT_DATE THEN
    remaining_label := 'today';
  ELSE
    remaining_label := 'tomorrow';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, related_task_id)
  VALUES (
    task_row.assigned_to,
    'deadline_approaching',
    format('Deadline reminder: "%s" is due %s.', task_row.title, remaining_label),
    task_row.id
  );

  UPDATE public.tasks
  SET deadline_alert_sent_for = task_row.due_date
  WHERE id = task_row.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_team_member_project_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_deadline_alert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_deadline_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_deadline_notification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_team_member_project_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_deadline_alert() TO authenticated;