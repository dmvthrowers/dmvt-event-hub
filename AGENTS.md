# AGENTS.md — dmvt-event-hub

Orientation for any AI agent landing in this repo cold.

## What this is

**DMVT Events** — a real, deployed, actively-developed community event calendar for yo-yo
workshops/meetups/contests across DC/MD/VA, built for the DMV Throwers club. Anyone can submit
an event with no login, verified by email, published immediately. Target domain:
`events.dmvthrowers.club`. Sibling repo to `dmvthrowers.github.io` (the static club site) and
`yoyo-player-map` (a separate map-focused events app) — read `README.md` for how this repo
describes its own relationship to self-hosting, since it started life as a **Lovable Cloud**
project (`.lovable/plan.md` has the original build plan) and is designed to be exportable and
self-hostable on Vercel + a free Supabase project independent of Lovable.

**Real stack, not a prototype**: React 18 + Vite + Tailwind + shadcn/ui frontend, Supabase
backend (Postgres + RLS, edge functions, `pg_cron`/`pg_net` for scheduled jobs), Leaflet +
OpenStreetMap for maps (no API key needed), Nominatim for geocoding. Git history shows real
security hardening work (RLS lockdowns, token hashing, GraphQL privilege lockdown, admin
bootstrap RPC scoping) — treat this as a live service with real user data, not a toy.

## Layout

```
src/                      React app (App.tsx, pages/, components/, hooks/, integrations/, lib/)
supabase/migrations/       real, dated SQL migrations -- read the newest few before assuming schema
supabase/functions/        edge functions: submit-event, verify-event, manage-event, renew-event,
                            daily-maintenance (cron), report-event, admin-action, geocode, feeds,
                            feed-subscribe, manage-feed-subscription, sitemap, service-status
supabase/functions/_shared/email.ts        transactional email via Resend (RESEND_API_KEY secret);
                            email-stub.ts is a leftover no function imports
supabase/functions/_shared/occurrences.ts  the ONE occurrence generator (nth-weekday monthly,
                            New York wall-clock -> UTC); tested in src/test/occurrences.test.ts
supabase/seed.sql           local/staging seed data, tagged 'seed', dates relative to today
skills/                    *.SKILL.md files. automated-testing-data-seeding is current and specific
                            to this repo; most of the others are generic stubs copied from the map
                            repo, so verify against the code before trusting them.
.lovable/plan.md            original Lovable build plan, historical
```

## Gotchas

- **A real `.env` file exists in this repo** (not just `.env.example`) — `.gitignore` correctly
  excludes `.env`/`.env.local`/`.env.*.local`, so it's not tracked, but be careful with any tool
  or command that might read/echo/upload the working tree wholesale.
- **Email goes through Resend** (`_shared/email.ts`). It only delivers if the
  `RESEND_API_KEY` function secret is set on the Supabase project.
- **Times are America/New_York wall-clock.** Never append `Z` to `start_time`; use
  `buildOccurrences` from `_shared/occurrences.ts`.
- **`bootstrap_first_admin()` is intentionally a no-op once any admin exists** and isn't exposed
  to signed-in users via RPC — this is a deliberate one-time-bootstrap security boundary, not a
  bug if it "stops working" after the first admin is created.
- **`.github/` had duplicated nested scaffolding removed** (commit `38b663c`) — if you see
  `.github/.github`-shaped weirdness again, it's a known recurring artifact from however these
  templates get applied, not a new issue.
- **`.vs/` is an editor artifact**, not project config.
- Package manager is **bun** (`bun.lockb` present) even though `package-lock.json` also exists —
  prefer `bun install`/`bun run dev` per the README; the npm lockfile may just be for tooling
  that expects one.

## Verify

```bash
bun install
bun run dev            # local dev server
bun run lint
bun run typecheck
bun run test           # vitest (see skills/automated-testing-data-seeding.SKILL.md)
bun run build
```

TypeScript is installed twice on purpose: `tsc` (what `typecheck` runs) is TypeScript 7
(`@typescript/native`), and the `typescript` package is the TypeScript 6 API
(`@typescript/typescript6`) for typescript-eslint and editors. TypeScript 7.0 has no API yet; drop
the alias once typescript-eslint supports 7.x.

`supabase db reset` applies migrations and `supabase/seed.sql` locally. RLS and edge-function
behavior still needs a real (or linked) Supabase project.
