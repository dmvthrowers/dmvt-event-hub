-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.event_type AS ENUM ('workshop', 'meetup', 'contest');
CREATE TYPE public.event_status AS ENUM ('pending', 'published', 'expired', 'hidden');
CREATE TYPE public.recurrence_kind AS ENUM ('none', 'weekly', 'biweekly', 'monthly_by_weekday');
CREATE TYPE public.skill_level AS ENUM ('all', 'beginner', 'intermediate', 'advanced');
CREATE TYPE public.report_status AS ENUM ('open', 'resolved', 'dismissed');

-- =========================
-- HELPER: timestamp updater
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- USER ROLES (security-critical)
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- A logged-in user can see their own role row
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- PROFILES (admin display names)
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by self or admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- SUBMITTERS (anon contributors, keyed by email)
-- =========================
CREATE TABLE public.submitters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  submission_count INT NOT NULL DEFAULT 0,
  banned BOOLEAN NOT NULL DEFAULT false,
  banned_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.submitters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view submitters"
  ON public.submitters FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update submitters"
  ON public.submitters FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER submitters_set_updated_at
  BEFORE UPDATE ON public.submitters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- EVENTS
-- =========================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,

  -- Core
  title TEXT NOT NULL,
  type public.event_type NOT NULL,
  description TEXT NOT NULL,

  -- Organizer + contact
  organizer_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  public_contact TEXT,

  -- Location
  venue_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Dates / times
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN NOT NULL DEFAULT false,

  -- Recurrence
  recurrence public.recurrence_kind NOT NULL DEFAULT 'none',
  recurrence_until DATE,

  -- Cost
  is_free BOOLEAN NOT NULL DEFAULT true,
  cost_amount NUMERIC(10, 2),
  cost_currency TEXT DEFAULT 'USD',

  -- Audience
  age_min INT,
  age_label TEXT,
  skill_level public.skill_level NOT NULL DEFAULT 'all',
  capacity INT,

  -- Links / media
  info_url TEXT,
  image_url TEXT,
  tags TEXT[],

  -- Lifecycle
  status public.event_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 year'),
  published_at TIMESTAMPTZ,
  view_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_status_start_idx ON public.events (status, start_date);
CREATE INDEX events_type_idx ON public.events (type);
CREATE INDEX events_geo_idx ON public.events (latitude, longitude);
CREATE INDEX events_expires_idx ON public.events (expires_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public read of published events only
CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Admins can read everything
CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert (will land as 'pending'); validation happens server-side too
CREATE POLICY "Anyone can submit an event"
  ON public.events FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Only admins can update/delete via direct SQL; submitter updates go through edge function with manage_token
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validation trigger (replaces non-immutable CHECK constraints)
CREATE OR REPLACE FUNCTION public.validate_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF char_length(NEW.title) < 3 OR char_length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Event title must be 3-200 characters';
  END IF;

  IF char_length(NEW.description) < 10 OR char_length(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Event description must be 10-5000 characters';
  END IF;

  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be on or after start_date';
  END IF;

  -- Cap multi-day single events at 3 days (recurring events use recurrence_until instead)
  IF NEW.recurrence = 'none' AND (NEW.end_date - NEW.start_date) > 2 THEN
    RAISE EXCEPTION 'Single events can span at most 3 days';
  END IF;

  -- Recurring events must have an end date no more than 1 year out
  IF NEW.recurrence <> 'none' THEN
    IF NEW.recurrence_until IS NULL THEN
      RAISE EXCEPTION 'Recurring events require recurrence_until';
    END IF;
    IF NEW.recurrence_until > (NEW.start_date + interval '1 year')::date THEN
      RAISE EXCEPTION 'recurrence_until cannot be more than 1 year after start_date';
    END IF;
  END IF;

  IF NOT NEW.all_day THEN
    IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
      RAISE EXCEPTION 'Non-all-day events require start_time and end_time';
    END IF;
  END IF;

  IF NOT NEW.is_free AND (NEW.cost_amount IS NULL OR NEW.cost_amount < 0) THEN
    RAISE EXCEPTION 'Paid events require a non-negative cost_amount';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER events_validate
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.validate_event();

-- =========================
-- EVENT OCCURRENCES (materialized for fast querying)
-- =========================
CREATE TABLE public.event_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_occurrences_event_idx ON public.event_occurrences (event_id);
CREATE INDEX event_occurrences_start_idx ON public.event_occurrences (start_at);

ALTER TABLE public.event_occurrences ENABLE ROW LEVEL SECURITY;

-- Public read but only for occurrences whose parent event is published
CREATE POLICY "Anyone can view occurrences of published events"
  ON public.event_occurrences FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Admins can view all occurrences"
  ON public.event_occurrences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage occurrences"
  ON public.event_occurrences FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- VERIFICATION TOKENS (single-use, publishes event when consumed)
-- =========================
CREATE TABLE public.verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX verification_tokens_token_idx ON public.verification_tokens (token);
CREATE INDEX verification_tokens_event_idx ON public.verification_tokens (event_id);

ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view verification tokens"
  ON public.verification_tokens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- MANAGE TOKENS (long-lived, lets submitter edit / cancel / renew)
-- =========================
CREATE TABLE public.manage_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX manage_tokens_token_idx ON public.manage_tokens (token);
CREATE INDEX manage_tokens_event_idx ON public.manage_tokens (event_id);

ALTER TABLE public.manage_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view manage tokens"
  ON public.manage_tokens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- REPORTS (abuse / inaccurate listings)
-- =========================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reporter_email TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reports_status_idx ON public.reports (status);
CREATE INDEX reports_event_idx ON public.reports (event_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a report
CREATE POLICY "Anyone can submit a report"
  ON public.reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'open');

-- Only admins can read or update reports
CREATE POLICY "Admins can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();