-- Addresses Supabase linter warnings:
--   0026 pg_graphql_anon_table_exposed
--   0027 pg_graphql_authenticated_table_exposed
--   0028 anon_security_definer_function_executable
--   0029 authenticated_security_definer_function_executable
--
-- Strategy:
--   • Revoke SELECT from anon on every table that has no legitimate anon read path.
--     (events + event_occurrences are intentionally public — leave them.)
--   • Revoke SELECT from authenticated on pure token/feed tables, which are only
--     ever accessed by edge functions via the service-role key (bypasses RLS).
--     Admin-facing tables (reports, submitters, profiles, user_roles) stay accessible
--     to authenticated because the admin SPA queries them directly.
--   • Revoke EXECUTE on SECURITY DEFINER functions that must not be callable via
--     the public REST/GraphQL API.

-- ──────────────────────────────────────────────
-- 1. Hide internal tables from the anon GraphQL schema
-- ──────────────────────────────────────────────
REVOKE SELECT ON TABLE public.profiles          FROM anon;
REVOKE SELECT ON TABLE public.user_roles        FROM anon;
REVOKE SELECT ON TABLE public.submitters        FROM anon;
REVOKE SELECT ON TABLE public.reports           FROM anon;
REVOKE SELECT ON TABLE public.manage_tokens     FROM anon;
REVOKE SELECT ON TABLE public.verification_tokens FROM anon;
REVOKE SELECT ON TABLE public.renew_tokens      FROM anon;
REVOKE SELECT ON TABLE public.feed_subscriptions  FROM anon;
REVOKE SELECT ON TABLE public.feed_manage_tokens  FROM anon;

-- ──────────────────────────────────────────────
-- 2. Hide token/feed tables from the authenticated GraphQL schema
--    (edge functions use service_role — no PostgREST access needed)
-- ──────────────────────────────────────────────
REVOKE SELECT ON TABLE public.manage_tokens       FROM authenticated;
REVOKE SELECT ON TABLE public.verification_tokens FROM authenticated;
REVOKE SELECT ON TABLE public.renew_tokens        FROM authenticated;
REVOKE SELECT ON TABLE public.feed_manage_tokens  FROM authenticated;
REVOKE SELECT ON TABLE public.feed_subscriptions  FROM authenticated;

-- ──────────────────────────────────────────────
-- 3. Lock down SECURITY DEFINER functions
-- ──────────────────────────────────────────────

-- bootstrap_first_admin was granted to authenticated in 20260428; revoke it.
-- (Idempotent: REVOKE on an already-absent grant is a no-op.)
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;

-- rls_auto_enable is a utility function used only during migrations.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_auto_enable'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END;
$$;
