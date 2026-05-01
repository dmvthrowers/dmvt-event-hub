
CREATE TABLE public.feed_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  label text,
  filter_types text[],
  filter_regions text[],
  filter_cities text[],
  filter_free_only boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_subscriptions_email ON public.feed_subscriptions (lower(email));
CREATE INDEX idx_feed_subscriptions_token ON public.feed_subscriptions (token);

ALTER TABLE public.feed_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view feed subscriptions"
  ON public.feed_subscriptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update feed subscriptions"
  ON public.feed_subscriptions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER feed_subscriptions_set_updated_at
  BEFORE UPDATE ON public.feed_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.feed_manage_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_manage_tokens_email ON public.feed_manage_tokens (lower(email));

ALTER TABLE public.feed_manage_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view feed manage tokens"
  ON public.feed_manage_tokens FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
