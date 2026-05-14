# DMVT Events

Free, community-built calendar for yo-yo workshops, club meetups, and contests across DC / MD / VA. Anyone can submit an event, no login required — verified by email and published immediately.

Built with React + Vite + Tailwind + shadcn/ui on top of Lovable Cloud (Supabase). Designed to be easy to self-host on Vercel + a free Supabase project.

---

## Local development

```bash
bun install
bun run dev
```

The app expects these env vars (auto-provided in Lovable, set manually when self-hosting):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

---

## Architecture

- **Frontend:** React 18 + Vite, Tailwind, shadcn/ui. React Router. Sharp-corner DMVT design system in `src/index.css`.
- **Backend:** Supabase (auth, Postgres + RLS, edge functions, cron via `pg_cron` + `pg_net`).
- **Maps:** Leaflet + OpenStreetMap (no API key).
- **Geocoding:** Nominatim with caching.
- **Email:** stub logger (`supabase/functions/_shared/email-stub.ts`) — swap for Resend/Postmark when self-hosting.

### Key tables

`events`, `event_occurrences`, `submitters`, `verification_tokens`, `manage_tokens`, `renew_tokens`, `reports`, `user_roles`, `profiles`. RLS enforced on all; `has_role(uid, role)` security-definer function gates admin access.

### Edge functions

- `submit-event` — public submission, honeypot + rate limit, sends verification email
- `verify-event` — consumes verification token, publishes event, returns manage link
- `manage-event` — submitter self-service (edit / cancel / renew)
- `renew-event` — one-click renewal from email
- `daily-maintenance` — cron at 09:00 UTC: re-materializes recurring occurrences, sends 14-day renewal reminders, auto-hides expired events

---

## Self-hosting (Vercel + free Supabase)

1. **Export the repo** from Lovable (Share → Export to GitHub).
2. **Create a Supabase project** at supabase.com (free tier is fine).
3. **Run migrations:** `supabase link --project-ref <ref> && supabase db push` (migrations live in `supabase/migrations`).
4. **Deploy edge functions:** `supabase functions deploy submit-event verify-event manage-event renew-event daily-maintenance`.
5. **Schedule the cron job** in the Supabase SQL editor:

   ```sql
   select cron.schedule(
     'daily-maintenance',
     '0 9 * * *',
     $$ select net.http_post(
          url := 'https://<ref>.functions.supabase.co/daily-maintenance',
          headers := jsonb_build_object('x-cron-secret', '<DAILY_MAINTENANCE_SECRET>')
        ); $$
   );
   ```

6. **Set function secrets** in Supabase: `DAILY_MAINTENANCE_SECRET`, plus your email provider keys when you replace the stub.
7. **Bootstrap the first admin:** sign up via `/admin`, then run `select public.bootstrap_first_admin();` from the Supabase SQL editor or another privileged server-side session. The app no longer exposes this RPC to signed-in users, and it remains a no-op once any admin exists.
8. **Deploy to Vercel:** point at the repo, set the three `VITE_SUPABASE_*` env vars, deploy.
9. **Custom domain:** add `events.dmvthrowers.club` in Vercel.

### Swapping the email stub

Replace `supabase/functions/_shared/email-stub.ts` with a real provider call (Resend example):

```ts
await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ from, to, subject, html }),
});
```

All callers (`submit-event`, `verify-event`, `daily-maintenance`) already go through this single helper.

---

## Accessibility

- Skip-to-content link, `<main>` landmark, labeled nav.
- Semantic headings, focus-visible rings on all interactive elements.
- All form fields paired with `<label>`; error messages associated via `aria-describedby` in shadcn `Form`.
- Color contrast meets WCAG AA against the cream/navy palette.

---

## License

MIT — fork it, host it, make it your scene's calendar.
