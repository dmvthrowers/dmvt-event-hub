-- =============================================================================
-- Local / staging seed data for DMVT Events
-- =============================================================================
-- Loaded automatically by `supabase db reset` (Supabase CLI reads supabase/seed.sql).
-- Can also be pasted into the SQL editor of a staging project. NEVER run on production.
--
-- * Every seeded row is tagged 'seed' and uses @example.org addresses, so it is easy to
--   spot and remove:  DELETE FROM public.events WHERE 'seed' = ANY(tags);
-- * Dates are relative to current_date, so the calendar is never empty no matter when
--   you reset. Times are America/New_York wall-clock, matching
--   supabase/functions/_shared/occurrences.ts.
-- * Idempotent: re-running deletes the previous seed rows first.
--
-- Coverage (each row exercises a different path):
--   1. monthly_by_weekday, free, all ages     -> the real DMV Throwers 3rd-Sunday meetup
--   2. weekly, adults-only, evening           -> recurring + age label
--   3. one-off paid workshop                  -> cost formatting, "free only" filter
--   4. two-day all-day contest                -> multi-day span, contest styling
--   5. pending (unverified) submission        -> admin moderation queue
--   6. published but past expires_at          -> daily-maintenance auto-hide + renewal
-- =============================================================================

BEGIN;

DELETE FROM public.events WHERE 'seed' = ANY(tags);

-- Anchor dates --------------------------------------------------------------
CREATE TEMP TABLE seed_dates ON COMMIT DROP AS
WITH months AS (
  SELECT (date_trunc('month', current_date) + make_interval(months => m))::date AS first_of_month
  FROM generate_series(0, 7) AS m
),
third_sundays AS (
  SELECT first_of_month + ((7 - extract(dow FROM first_of_month)::int) % 7) + 14 AS d
  FROM months
)
SELECT
  (SELECT min(d) FROM third_sundays WHERE d >= current_date)                AS meetup_start,
  current_date + ((4 - extract(dow FROM current_date)::int + 7) % 7)         AS thursday_start,
  current_date + 21 + ((6 - extract(dow FROM current_date + 21)::int + 7) % 7) AS workshop_day,
  current_date + 60 + ((6 - extract(dow FROM current_date + 60)::int + 7) % 7) AS contest_day;

-- Events --------------------------------------------------------------------
INSERT INTO public.events (
  id, slug, title, type, description, organizer_name, submitter_email, public_contact,
  venue_name, address, city, region, country, latitude, longitude,
  start_date, end_date, start_time, end_time, all_day,
  recurrence, recurrence_until, is_free, cost_amount, cost_currency,
  age_min, age_label, skill_level, info_url, tags,
  status, published_at, expires_at
)
SELECT * FROM (
  SELECT
    '5eed0000-0000-4000-8000-000000000001'::uuid, 'seed-dmv-throwers-monthly-meetup',
    'DMV Throwers Monthly Meetup', 'meetup'::public.event_type,
    'Free monthly yo-yo and skill toy meetup. All ages, all levels, always free. Loaner yo-yos available. No registration required.',
    'DMV Throwers', 'seed-organizer@example.org', 'contact@dmvthrowers.club',
    'Arlington Central Library', '1015 N Quincy St, Arlington, VA 22201', 'Arlington', 'VA', 'US', 38.8826, -77.1067,
    s.meetup_start, s.meetup_start, '13:00'::time, '16:00'::time, false,
    'monthly_by_weekday'::public.recurrence_kind, s.meetup_start + 180, true, NULL::numeric, 'USD',
    NULL::int, 'All ages', 'all'::public.skill_level, 'https://dmvthrowers.club/events.html', ARRAY['seed','meetup','arlington'],
    'published'::public.event_status, now(), now() + interval '1 year'
  FROM seed_dates s
  UNION ALL
  SELECT
    '5eed0000-0000-4000-8000-000000000002', 'seed-thursday-night-throw',
    'Thursday Night Throw (Seed Example)', 'meetup',
    'Example weekly adults-only session. Bring a yo-yo, kendama or spin top. Seed data for testing recurring events.',
    'Example Throwers', 'seed-weekly@example.org', NULL,
    'Example Arcade', '100 Example St, Alexandria, VA 22314', 'Alexandria', 'VA', 'US', 38.8048, -77.0469,
    s.thursday_start, s.thursday_start, '19:00', '21:00', false,
    'weekly', s.thursday_start + 56, true, NULL, 'USD',
    18, '18+', 'all', NULL, ARRAY['seed','adults'],
    'published', now(), now() + interval '1 year'
  FROM seed_dates s
  UNION ALL
  SELECT
    '5eed0000-0000-4000-8000-000000000003', 'seed-beginner-workshop',
    'Beginner Yo-Yo Workshop (Seed Example)', 'workshop',
    'Example 90-minute intro class. Learn a throw, a sleeper and your first three tricks. Yo-yo included in the fee.',
    'Example Library', 'seed-workshop@example.org', 'workshops@example.org',
    'Example Branch Library', '200 Example Ave, Fairfax, VA 22030', 'Fairfax', 'VA', 'US', 38.8462, -77.3064,
    s.workshop_day, s.workshop_day, '10:30', '12:00', false,
    'none', NULL, false, 10.00, 'USD',
    8, 'Ages 8+', 'beginner', NULL, ARRAY['seed','beginner'],
    'published', now(), now() + interval '1 year'
  FROM seed_dates s
  UNION ALL
  SELECT
    '5eed0000-0000-4000-8000-000000000004', 'seed-regional-contest',
    'Example Regional Yo-Yo Contest (Seed Example)', 'contest',
    'Example two-day contest with 1A, X-Division and Sport divisions. Spectating is free; competitor entry fee shown.',
    'Example Contest Crew', 'seed-contest@example.org', NULL,
    'Example Mall Center Court', '300 Example Blvd, Sterling, VA 20166', 'Sterling', 'VA', 'US', 39.0324, -77.4211,
    s.contest_day, s.contest_day + 1, NULL, NULL, true,
    'none', NULL, false, 20.00, 'USD',
    NULL, 'All ages', 'all', NULL, ARRAY['seed','contest'],
    'published', now(), now() + interval '1 year'
  FROM seed_dates s
  UNION ALL
  SELECT
    '5eed0000-0000-4000-8000-000000000005', 'seed-pending-submission',
    'Pending Park Meetup (Seed Example)', 'meetup',
    'Example unverified submission. Should appear only in the admin queue, never on the public calendar.',
    'Example Organizer', 'seed-pending@example.org', NULL,
    'Example Park Pavilion', '400 Example Rd, Silver Spring, MD 20910', 'Silver Spring', 'MD', 'US', 38.9907, -77.0261,
    current_date + 10, current_date + 10, '14:00', '16:00', false,
    'none', NULL, true, NULL, 'USD',
    NULL, NULL, 'all', NULL, ARRAY['seed'],
    'pending', NULL, now() + interval '1 year'
  FROM seed_dates s
  UNION ALL
  SELECT
    '5eed0000-0000-4000-8000-000000000006', 'seed-expired-listing',
    'Expired Listing (Seed Example)', 'workshop',
    'Example listing whose expires_at has passed. daily-maintenance should auto-hide it and send a renewal email.',
    'Example Organizer', 'seed-expired@example.org', NULL,
    'Example Rec Center', '500 Example Way, Washington, DC 20001', 'Washington', 'DC', 'US', 38.9101, -77.0147,
    current_date + 14, current_date + 14, '11:00', '12:00', false,
    'none', NULL, true, NULL, 'USD',
    NULL, NULL, 'all', NULL, ARRAY['seed'],
    'published', now() - interval '1 year', now() - interval '1 day'
  FROM seed_dates s
) AS rows;

-- Occurrences ---------------------------------------------------------------
-- In production these come from verify-event; here they are built in SQL with the same
-- rules (3rd-Sunday slot, New York wall-clock times) so the calendar renders right away.
INSERT INTO public.event_occurrences (event_id, start_at, end_at, all_day)
-- 1. Monthly 3rd Sunday, 1-4 PM, six months
SELECT '5eed0000-0000-4000-8000-000000000001'::uuid,
       (d + time '13:00') AT TIME ZONE 'America/New_York',
       (d + time '16:00') AT TIME ZONE 'America/New_York',
       false
FROM (
  SELECT f + ((7 - extract(dow FROM f)::int) % 7) + 14 AS d
  FROM (
    SELECT (date_trunc('month', (SELECT meetup_start FROM seed_dates)) + make_interval(months => m))::date AS f
    FROM generate_series(0, 6) AS m
  ) months
) sundays
WHERE d <= (SELECT meetup_start + 180 FROM seed_dates)
UNION ALL
-- 2. Weekly Thursday, 7-9 PM, nine weeks
SELECT '5eed0000-0000-4000-8000-000000000002'::uuid,
       ((s.thursday_start + w * 7) + time '19:00') AT TIME ZONE 'America/New_York',
       ((s.thursday_start + w * 7) + time '21:00') AT TIME ZONE 'America/New_York',
       false
FROM seed_dates s, generate_series(0, 8) AS w
UNION ALL
-- 3. One-off workshop
SELECT '5eed0000-0000-4000-8000-000000000003'::uuid,
       (s.workshop_day + time '10:30') AT TIME ZONE 'America/New_York',
       (s.workshop_day + time '12:00') AT TIME ZONE 'America/New_York',
       false
FROM seed_dates s
UNION ALL
-- 4. Two-day all-day contest
SELECT '5eed0000-0000-4000-8000-000000000004'::uuid,
       (s.contest_day + time '00:00') AT TIME ZONE 'America/New_York',
       (s.contest_day + 1 + time '23:59:59') AT TIME ZONE 'America/New_York',
       true
FROM seed_dates s
UNION ALL
-- 6. Expired listing still has an occurrence so auto-hide has something to hide
SELECT '5eed0000-0000-4000-8000-000000000006'::uuid,
       ((current_date + 14) + time '11:00') AT TIME ZONE 'America/New_York',
       ((current_date + 14) + time '12:00') AT TIME ZONE 'America/New_York',
       false;
-- 5. Pending submission intentionally has no occurrences (verify-event creates them).

COMMIT;

-- Quick check after seeding:
--   SELECT e.title, e.status, count(o.*) AS occurrences, min(o.start_at) AS next_start
--   FROM public.events e LEFT JOIN public.event_occurrences o ON o.event_id = e.id
--   WHERE 'seed' = ANY(e.tags) GROUP BY e.title, e.status ORDER BY next_start NULLS LAST;
