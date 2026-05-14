-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action      text        NOT NULL,  -- e.g. "publish_event", "hide_event", "resolve_report"
  target_type text        NOT NULL,  -- "event" | "report"
  target_id   text        NOT NULL,
  ip          text,
  metadata    jsonb
);

-- Admins can read; nobody can write from the client (service role only)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Hash all existing one-time tokens with SHA-256.
-- feed_subscriptions.token is intentionally excluded — those are persistent
-- ICS/RSS URLs bookmarked by calendar apps; hashing would break all subscriptions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE public.verification_tokens
   SET token = encode(digest(token, 'sha256'), 'hex')
 WHERE length(token) <> 64;  -- skip rows already in hex-64 form

UPDATE public.renew_tokens
   SET token = encode(digest(token, 'sha256'), 'hex')
 WHERE length(token) <> 64;

UPDATE public.manage_tokens
   SET token = encode(digest(token, 'sha256'), 'hex')
 WHERE length(token) <> 64;

UPDATE public.feed_manage_tokens
   SET token = encode(digest(token, 'sha256'), 'hex')
 WHERE length(token) <> 64;
