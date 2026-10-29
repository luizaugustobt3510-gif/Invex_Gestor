REVOKE EXECUTE ON FUNCTION public.routine_has_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.routine_is_premium(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.routine_access_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.routine_enforce_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.routine_has_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.routine_is_premium(uuid) TO authenticated;