REVOKE ALL ON FUNCTION public.enforce_team_member_project_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_deadline_alert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_deadline_notification(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.create_deadline_notification(uuid);