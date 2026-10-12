# Automated Testing & Data Seeding — dmvt-event-hub

Use this before touching recurrence, occurrence generation, date/time handling, filters,
or anything you'd want sample data for.

## Commands

```bash
npm ci                 # bun install also works; CI uses npm
npm test               # vitest, jsdom, TZ pinned to UTC (see vite.config.ts `test`)
npm run typecheck      # tsc -p tsconfig.app.json --noEmit
npm run lint
npm run build
```

CI (`.github/workflows/lint.yml`) runs lint, typecheck and tests on every push and PR to
`main`/`develop`. Keep all three green.

## What the tests cover

| File | Covers |
|---|---|
| `src/test/occurrences.test.ts` | `supabase/functions/_shared/occurrences.ts`: recurrence normalization, nth-weekday monthly (3rd Sunday stays 3rd Sunday, 5th weekday becomes last), America/New_York to UTC across DST, all-day and multi-day spans, `from` filtering, 400-row cap |
| `src/test/events.test.ts` | `src/lib/events.ts`: `applyFilters`, `formatCost`, `formatLocation`, brand colors per type |

`occurrences.ts` has no imports on purpose, so the same file runs in Deno edge functions and
in Vitest. If you change occurrence rules, change them there only. `verify-event`,
`manage-event` and `daily-maintenance` all call `buildOccurrences`.

## Seed data

`supabase/seed.sql` loads on `supabase db reset` (local) or can be pasted into a staging
project's SQL editor. Never run it on production.

- Six events covering every path: the real DMV Throwers 3rd-Sunday meetup (monthly), a weekly
  adults-only session, a paid one-off workshop, a two-day all-day contest, a pending
  submission (admin queue), and a published-but-expired listing (auto-hide + renewal email).
- Dates are relative to `current_date`, so the calendar is never empty.
- Every row is tagged `seed` and uses `@example.org` submitters. Remove with
  `DELETE FROM public.events WHERE 'seed' = ANY(tags);`
- Idempotent: re-running replaces the previous seed rows.

### Checking the seed without a Supabase project

PGlite (Postgres compiled to WASM) can apply every migration plus the seed in a few seconds.
Stub `auth.users`, `auth.uid()` and the `anon`/`authenticated`/`service_role` roles first,
then apply `supabase/migrations/*.sql` in order and run `seed.sql` twice. The query at the
bottom of `seed.sql` shows per-event occurrence counts and first start times.

## Rules worth testing whenever you touch scheduling

- `start_time`/`end_time` are New York wall-clock times. A 1–4 PM meetup must be `17:00Z`
  in October (EDT) and `18:00Z` in November (EST).
- The DB enum is `monthly_by_weekday`. The form sends that value; `submit-event` also
  accepts the legacy `"monthly"` and normalizes it.
- `event_status` has no `cancelled` value. Owner cancellation sets `hidden`, which drops the
  event from public views and from daily-maintenance's re-materialize query.
