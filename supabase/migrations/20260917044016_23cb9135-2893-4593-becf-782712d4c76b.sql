REVOKE EXECUTE ON FUNCTION public.add_or_invite_member(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_or_invite_member(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_workspace_invitations() FROM public, anon, authenticated;