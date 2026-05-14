-- Resolves Supabase linter warnings:
--   0003 auth_rls_initplan          – wrap auth.uid() in (SELECT ...) everywhere
--   0006 multiple_permissive_policies – merge overlapping per-role SELECT policies
--   0009 duplicate_index            – drop redundant events_expires_at index
--
-- Also fixes the audit_log policy introduced in 20260514120000 before it
-- reaches the live database.
--
-- Idempotent: uses DROP POLICY IF EXISTS before every CREATE so this migration
-- applies cleanly whether or not 20260513 was previously applied.

-- ──────────────────────────────────────────────
-- 1. user_roles
--    Merge two authenticated SELECT policies → one; fix initplan on all.
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own roles"                    ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles"                         ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view their own or admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles"                           ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles"                           ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles"                           ON public.user_roles;

CREATE POLICY "Authenticated users can view their own or admin roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ──────────────────────────────────────────────
-- 2. profiles
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Profiles are viewable by self or admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"     ON public.profiles;

CREATE POLICY "Profiles are viewable by self or admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id);

-- ──────────────────────────────────────────────
-- 3. submitters
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view submitters"   ON public.submitters;
DROP POLICY IF EXISTS "Admins can update submitters" ON public.submitters;

CREATE POLICY "Admins can view submitters"
  ON public.submitters FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update submitters"
  ON public.submitters FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ──────────────────────────────────────────────
-- 4. events
--    Merge authenticated SELECT policies → one role-scoped policy each.
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view published events"               ON public.events;
DROP POLICY IF EXISTS "Admins can view all events"                     ON public.events;
DROP POLICY IF EXISTS "Anon users can view published events"           ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view published or admin events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events"                       ON public.events;
DROP POLICY IF EXISTS "Admins can delete events"                       ON public.events;

CREATE POLICY "Anon users can view published events"
  ON public.events FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated users can view published or admin events"
  ON public.events FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ──────────────────────────────────────────────
-- 5. event_occurrences
--    Replace three overlapping authenticated SELECT policies with two
--    role-specific ones; add explicit per-operation admin write policies.
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view occurrences of published events"        ON public.event_occurrences;
DROP POLICY IF EXISTS "Admins can view all occurrences"                        ON public.event_occurrences;
DROP POLICY IF EXISTS "Admins can manage occurrences"                          ON public.event_occurrences;
DROP POLICY IF EXISTS "Anon users can view published occurrences"              ON public.event_occurrences;
DROP POLICY IF EXISTS "Authenticated users can view published or admin occurrences" ON public.event_occurrences;
DROP POLICY IF EXISTS "Admins can insert occurrences"                          ON public.event_occurrences;
DROP POLICY IF EXISTS "Admins can update occurrences"                          ON public.event_occurrences;
DROP POLICY IF EXISTS "Admins can delete occurrences"                          ON public.event_occurrences;

CREATE POLICY "Anon users can view published occurrences"
  ON public.event_occurrences FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can view published or admin occurrences"
  ON public.event_occurrences FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can insert occurrences"
  ON public.event_occurrences FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update occurrences"
  ON public.event_occurrences FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete occurrences"
  ON public.event_occurrences FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ──────────────────────────────────────────────
-- 6. verification_tokens / manage_tokens / renew_tokens
--    Fix initplan in admin-only SELECT policies.
--    (SELECT privilege on these was revoked in 20260514130000, but the
--     policy definitions should still be correct for defensibility.)
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view verification tokens" ON public.verification_tokens;
CREATE POLICY "Admins can view verification tokens"
  ON public.verification_tokens FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view manage tokens" ON public.manage_tokens;
CREATE POLICY "Admins can view manage tokens"
  ON public.manage_tokens FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view renew tokens" ON public.renew_tokens;
CREATE POLICY "Admins can view renew tokens"
  ON public.renew_tokens FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ──────────────────────────────────────────────
-- 7. reports
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view reports"   ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

CREATE POLICY "Admins can view reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ──────────────────────────────────────────────
-- 8. feed_subscriptions / feed_manage_tokens
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view feed subscriptions"   ON public.feed_subscriptions;
DROP POLICY IF EXISTS "Admins can update feed subscriptions" ON public.feed_subscriptions;

CREATE POLICY "Admins can view feed subscriptions"
  ON public.feed_subscriptions FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update feed subscriptions"
  ON public.feed_subscriptions FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view feed manage tokens" ON public.feed_manage_tokens;
CREATE POLICY "Admins can view feed manage tokens"
  ON public.feed_manage_tokens FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ──────────────────────────────────────────────
-- 9. audit_log (introduced in 20260514120000)
--    Fix initplan + hide from anon GraphQL schema.
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_read_audit_log" ON public.audit_log;

CREATE POLICY "admins_read_audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

REVOKE SELECT ON TABLE public.audit_log FROM anon;

-- ──────────────────────────────────────────────
-- 10. Duplicate index on events(expires_at)
-- ──────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_events_expires_at;
