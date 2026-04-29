-- Track renewal-reminder + auto-hide state on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_hidden_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_events_expires_at ON public.events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_status_expires ON public.events(status, expires_at);

-- Self-service renew tokens (one-click renewal from email)
CREATE TABLE IF NOT EXISTS public.renew_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renew_tokens_event ON public.renew_tokens(event_id);

ALTER TABLE public.renew_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can read; nothing else is allowed via PostgREST.
-- Service role (used by edge functions) bypasses RLS.
CREATE POLICY "Admins can view renew tokens"
  ON public.renew_tokens
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));