-- Last updated: 2026-05-13
-- Tighten exposed SECURITY DEFINER functions and clean up RLS policy performance warnings.

REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc proc
    JOIN pg_namespace ns ON ns.oid = proc.pronamespace
    WHERE ns.nspname = 'public'
      AND proc.proname = 'rls_auto_enable'
      AND pg_get_function_identity_arguments(proc.oid) = ''
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view their own or admin roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

ALTER POLICY "Admins can insert roles"
  ON public.user_roles
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can update roles"
  ON public.user_roles
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can delete roles"
  ON public.user_roles
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Profiles are viewable by self or admin"
  ON public.profiles
  USING (
    (SELECT auth.uid()) = id
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

ALTER POLICY "Users can update their own profile"
  ON public.profiles
  USING ((SELECT auth.uid()) = id);

ALTER POLICY "Admins can view submitters"
  ON public.submitters
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can update submitters"
  ON public.submitters
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Anon users can view published events"
  ON public.events
  FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated users can view published or admin events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

ALTER POLICY "Admins can update events"
  ON public.events
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can delete events"
  ON public.events
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can view occurrences of published events" ON public.event_occurrences;
DROP POLICY IF EXISTS "Admins can view all occurrences" ON public.event_occurrences;
DROP POLICY IF EXISTS "Admins can manage occurrences" ON public.event_occurrences;
CREATE POLICY "Anon users can view published occurrences"
  ON public.event_occurrences
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.events event_row
      WHERE event_row.id = event_id
        AND event_row.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can view published or admin occurrences"
  ON public.event_occurrences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events event_row
      WHERE event_row.id = event_id
        AND event_row.status = 'published'
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert occurrences"
  ON public.event_occurrences
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update occurrences"
  ON public.event_occurrences
  FOR UPDATE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete occurrences"
  ON public.event_occurrences
  FOR DELETE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can view verification tokens"
  ON public.verification_tokens
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can view manage tokens"
  ON public.manage_tokens
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can view reports"
  ON public.reports
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can update reports"
  ON public.reports
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can view renew tokens"
  ON public.renew_tokens
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can view feed subscriptions"
  ON public.feed_subscriptions
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can update feed subscriptions"
  ON public.feed_subscriptions
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Admins can view feed manage tokens"
  ON public.feed_manage_tokens
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP INDEX IF EXISTS public.idx_events_expires_at;
