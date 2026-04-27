-- Set explicit search_path on remaining functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.validate_event() SET search_path = public;

-- Revoke broad EXECUTE on SECURITY DEFINER functions; only RLS / triggers need them.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;