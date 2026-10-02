CREATE OR REPLACE FUNCTION public.is_workspace_manager(_ws uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = _ws AND w.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _ws AND m.user_id = auth.uid() AND m.role = 'task_manager'
  );
$function$;