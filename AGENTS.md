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
supabase/functions/_shared/email-stub.ts   ALL email currently goes through this stub logger --
                            not wired to a real provider yet, see README's "Swapping the email
                            stub" section for the Resend-shaped replacement
skills/                    8 *.SKILL.md files -- api-health-monitoring, automated-testing-data-
                            seeding, content-compliance-privacy, entry-moderation-review,
                            location-data-management, map-visualization-analytics, translation-
                            localization, user-feedback-triage. Read the relevant one before
                            touching that area -- they're real operational guidance, not filler.
.lovable/plan.md            original Lovable build plan, historical
```

## Gotchas

- **A real `.env` file exists in this repo** (not just `.env.example`) — `.gitignore` correctly
  excludes `.env`/`.env.local`/`.env.*.local`, so it's not tracked, but be careful with any tool
  or command that might read/echo/upload the working tree wholesale.
- **Email sending is currently a stub** (`email-stub.ts` just logs) — don't assume
  submit-event/verify-event/renew-event actually deliver mail in the current deployment unless
  you've confirmed the stub was swapped for a real provider.
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
bun run test           # vitest
bun run build
```

No local Supabase check-in here — schema/RLS/edge-function correctness needs a real (or linked)
Supabase project; there's no offline mock layer evident in this repo.
