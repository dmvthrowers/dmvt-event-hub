# YoYo Event Calendar — Plan

A free, community-contributed event hub where anyone can submit yo-yo workshops, club meetups, and contests/fairs. Visitors find events by **list**, **map**, or **calendar** view, filter by type/date/location, and discover events near them. Built to match DMVT design and to be easy to self-host long-term.

---

## Hosting & Sustainability Strategy

- **Build phase:** built and previewed on Lovable. Free `*.lovable.app` URL works out of the box for testing.
- **Long-term home:** the codebase will be portable so it can be exported and self-hosted on **Vercel + a free Supabase project** (mirroring how `yoyo-player-map` is hosted) at `events.dmvthrowers.club`. No recurring Lovable cost required.
- **Free-tier first design choices:**
  - **Maps:** Leaflet + free **OpenStreetMap** tiles (no API key, no quota concerns).
  - **Geocoding:** **Nominatim** (free, OSM) with a polite user-agent and result caching to stay within usage policy.
  - **Email:** low-volume, batched (one verification per submission, one renewal email per event per year). Stays inside free email quotas.
  - **Database:** auto-expire events after 1 year so the DB doesn't bloat.
  - **Spam protection:** honeypot + per-IP rate limiting on submit/verify so bots can't burn through quotas.
- **Donate link** (Ko-fi) in the footer matches the main club site for community support.

---

## Core Experience

### Public site

- **Landing** — Hero ("Find Your Crew. Throw Together."), 3 quick links (Submit Event / Browse Map / Browse Calendar), upcoming-events strip, "How it works" 3-step section, links back to dmvthrowers.club and map.dmvthrowers.club.
- **Events explorer** — single page with three synchronized views (toggle tabs):
  - **List view** — chronological cards grouped by month, with type badge, date/time, location, cost, age/skill level, organizer.
  - **Map view** — Leaflet + OpenStreetMap with clustered pins; click a pin → event popup → detail page.
  - **Calendar view** — month grid (with week/day toggle), event chips colored by type.
  - **Shared filter bar** above all views: type (Workshop / Meetup / Contest-Fair), date range, distance from a city/zip, free-only, age/skill level, search.
- **Event detail page** — full description, organizer + public contact, map, **Add to calendar (.ics)**, share buttons, "Report event" link.
- **Submit page** — public form, no login. Email-verified auto-publish.
- **Manage your event** — magic-link page (from the verification email) to edit, cancel, or renew.
- **Top bar / footer** — red top strip linking to dmvthrowers.club + map.dmvthrowers.club, navy nav, cream content sections, Ko-fi donate.

### Submission flow (hands-off)

1. Anyone fills the submit form.
2. We email a verification link to the submitter.
3. Click link → event goes **live immediately** on list/map/calendar.
4. Same email contains a private "manage" link (edit / cancel / renew).
5. Recurring events expire after **1 year max**. 14 days before expiry, the submitter gets a "renew" email; one click extends another year. If not renewed, the event auto-hides.

### Event types

- **Workshop** — single-session, often paid, instructor-led.
- **Club / Meetup** — usually recurring (e.g., "every 3rd Sunday").
- **Contest / Fair** — single or multi-day (up to 3 days).

### Date / time handling

- **Single date:** all-day OR specific start/end time.
- **Multi-day:** up to **3 consecutive days**, all-day or per-day times.
- **Recurring:** weekly / biweekly / monthly-by-weekday, with required end date capped at **+1 year**.

---

## Submission Form Fields

**Required:** title, type, organizer name, contact email (private — for verification + renewal), public contact (email/IG/discord/url), description, venue name, full address (geocoded), start date, start time or "All day", end date/time, recurrence pattern + end date (if recurring), cost (Free toggle, or amount + currency), info/registration URL.

**Optional:** age range (e.g., All ages, 13+), skill level (Beginner / Intermediate / Advanced / All), capacity, image/flyer, tags.

**Anti-spam:** honeypot field, per-IP rate limit, email verification gate.

---

## Admin Dashboard

Email/password + Google login. Roles in a separate `user_roles` table (security best practice).

- **Queue** — submissions with status (pending / live / expired / reported).
- **All events** — searchable, sortable table; bulk hide, delete, feature.
- **Edit any event** — same form as public, plus internal notes.
- **Reports** — abuse reports with one-click hide/delete + ban submitter.
- **Submitters** — submission history per email, ability to ban.
- **Settings** — manage event types, default region center, featured-event toggles.
- **Stats** — counts per type, per month, top regions.

---

## Design System (per DMVT-Design)

- **Colors:** `#B80000` red (CTAs, accents, top bar), `#102040` navy (dark sections, headings), `#fffdfa` cream (page bg), `#f7f3ec` cream-mid (alt sections), `#b0a890` borders, `#13C3A3` teal (Donate only).
- **Type badges:** Workshop = navy, Meetup = red, Contest = cream-on-navy with red border.
- **Typography:** Playfair Display (900/700) for headings/stat numbers, DM Sans (700/600/400) for body and UI. All-caps for nav and labels.
- **Layout:** 1100px max width, 80px vertical section padding, 64px sticky nav + 36px red top strip with "DMV THROWERS ↗" / "YOYO MAP ↗" links.
- **Sharp corners everywhere** — `border-radius: 0` on cards, buttons, inputs, tags. Brand motif.
- **Voice:** Direct, welcoming, second person, no emoji (except ☕ on Donate).

---

## Page Map

```text
/                  Landing (hero + how-it-works + upcoming strip)
/events            Explorer with List/Map/Calendar tabs + filters
/events/:slug      Event detail
/submit            Public submission form
/verify            Email-verification landing (reads token, publishes)
/manage/:token     Submitter self-service (edit/cancel/renew)
/about             What this is + DMVT link-back
/report/:eventId   Abuse report form
/admin             Admin login
/admin/dashboard   Admin home (queue + stats)
/admin/events      All events table
/admin/reports     Reports queue
/admin/submitters  Submitter management
```

---

## Technical Notes

- **Stack:** React + Vite + Tailwind + shadcn/ui (default Lovable). Portable to Vercel later with no rewrite.
- **Backend:** Lovable Cloud (Supabase). Tables: `events`, `event_occurrences` (materialized for fast calendar/map queries), `submitters`, `verification_tokens`, `manage_tokens`, `reports`, `banned_emails`, `user_roles`. RLS on every table; `has_role()` security-definer function for admin checks.
- **Geocoding:** Edge Function calling Nominatim with proper UA + caching. Stored as `lat`, `lng`, `city`, `region`, `country`.
- **Map:** Leaflet + react-leaflet + OpenStreetMap tiles with marker clustering.
- **Calendar:** FullCalendar (or `react-big-calendar`) themed with DMVT tokens.
- **Email:** Lovable's built-in email infrastructure for verification, manage-link, renewal reminder, and admin notifications.
- **Recurrence engine:** RRULE-style storage; daily Edge Function (cron) (a) materializes upcoming occurrences for the next 90 days, (b) sends 14-day renewal reminders, (c) hides expired events.
- **`.ics` export:** per-event endpoint, plus a "Subscribe to all events" feed URL.
- **Self-host portability:** all Supabase usage stays vendor-neutral so the project can be exported to a free Supabase project + Vercel deployment when ready.
- **Security:** zod validation client + server, honeypot, per-IP rate-limit on submit/verify, role-based admin via `user_roles`.

---

## Build Order

1. Design system + global layout (top bar, nav, footer, color/font tokens, sharp-corner shadcn overrides).
2. Landing page + static sections.
3. Lovable Cloud setup: schema, RLS, roles, edge function skeletons.
4. Submit form + email verification + manage-link flow.
5. Events explorer — List view first, then Map, then Calendar (shared filter state).
6. Event detail page + `.ics` export + report form.
7. Admin auth + dashboard (queue, events table, reports, submitters, stats).
8. Recurrence cron + renewal-reminder emails.
9. Polish, accessibility pass, self-hosting export notes.
