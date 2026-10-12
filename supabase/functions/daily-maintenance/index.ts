// supabase/functions/daily-maintenance/index.ts
//
// Runs once per day via pg_cron. Three jobs:
//   1) Re-materialize occurrences for any published recurring event whose
//      most recent occurrence is in the past but `recurrence_until` is still
//      in the future (defensive — catches drift).
//   2) Send a 14-day expiry reminder (one-shot per event) with a one-click
//      renew link.
//   3) Auto-hide events whose `expires_at` has passed (status -> 'hidden').
//
// Auth: this function is invoked by pg_cron via net.http_post and protected
// by a shared secret header `x-cron-secret` matched against the
// `DAILY_MAINTENANCE_SECRET` env var.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildOccurrences } from "../_shared/occurrences.ts";
import { sendMail } from "../_shared/email.ts";
import { getSiteUrl } from "../_shared/site-url.ts";
import { newToken, timingSafeEqual, hashToken } from "../_shared/tokens.ts";

interface EventRow {
  id: string;
  title: string;
  slug: string;
  submitter_email: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  recurrence: "none" | "weekly" | "biweekly" | "monthly" | "monthly_by_weekday";
  recurrence_until: string | null;
  expires_at: string;
  status: string;
  renewal_reminder_sent_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Shared-secret auth: accepts either a matching `x-cron-secret` header or
  // a Bearer token equal to the project service-role key (used by pg_cron).
  const expectedCron = Deno.env.get("DAILY_MAINTENANCE_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronHeader = req.headers.get("x-cron-secret");
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const ok =
    (expectedCron && cronHeader !== null && timingSafeEqual(cronHeader, expectedCron)) ||
    (serviceKey && bearer.length > 0 && timingSafeEqual(bearer, serviceKey));
  if (!ok) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const siteUrl = getSiteUrl();
  const now = new Date();

  // --- Job 3 first: hide expired events ---
  const { data: expired, error: expiredErr } = await supabase
    .from("events")
    .update({ status: "hidden", auto_hidden_at: now.toISOString() })
    .eq("status", "published")
    .lt("expires_at", now.toISOString())
    .select("id");

  if (expiredErr) console.error("hide_expired_failed", expiredErr);
  const hiddenCount = expired?.length ?? 0;

  // --- Job 2: 14-day renewal reminders ---
  const reminderCutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const { data: dueForReminder, error: reminderErr } = await supabase
    .from("events")
    .select(
      "id, title, slug, submitter_email, expires_at, renewal_reminder_sent_at, status",
    )
    .eq("status", "published")
    .is("renewal_reminder_sent_at", null)
    .lt("expires_at", reminderCutoff.toISOString())
    .gt("expires_at", now.toISOString())
    .limit(200);

  if (reminderErr) console.error("reminder_query_failed", reminderErr);

  let remindersSent = 0;
  for (const ev of dueForReminder ?? []) {
    const token = newToken(32);
    const { error: tokErr } = await supabase.from("renew_tokens").insert({
      event_id: ev.id,
      token: await hashToken(token),
    });
    if (tokErr) {
      console.error("renew_token_insert_failed", { event_id: ev.id });
      continue;
    }

    await sendMail({
      to: ev.submitter_email,
      template: "event-renewal",
      data: {
        eventTitle: ev.title,
        expiresAt: ev.expires_at,
        renewUrl: `${siteUrl}/renew?token=${token}`,
        siteUrl,
      },
    });

    await supabase
      .from("events")
      .update({ renewal_reminder_sent_at: now.toISOString() })
      .eq("id", ev.id);

    remindersSent++;
  }

  // --- Job 1: re-materialize stale recurring events (defensive) ---
  // Find published recurring events whose `recurrence_until` is in the future
  // but have no remaining future occurrences.
  const { data: recurring, error: recurErr } = await supabase
    .from("events")
    .select(
      "id, title, slug, submitter_email, start_date, end_date, start_time, end_time, all_day, recurrence, recurrence_until, expires_at, status, renewal_reminder_sent_at",
    )
    .eq("status", "published")
    .neq("recurrence", "none")
    .gt("recurrence_until", now.toISOString().slice(0, 10))
    .limit(500);

  if (recurErr) console.error("recurring_query_failed", recurErr);

  let rematerialized = 0;
  for (const ev of (recurring as EventRow[] | null) ?? []) {
    const { count } = await supabase
      .from("event_occurrences")
      .select("id", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .gte("end_at", now.toISOString());

    if ((count ?? 0) > 0) continue;

    // No future occurrences — regenerate from today forward.
    const occurrences = buildOccurrences(ev, { from: now });
    if (occurrences.length === 0) continue;

    await supabase.from("event_occurrences").delete().eq("event_id", ev.id);
    const { error: insErr } = await supabase
      .from("event_occurrences")
      .insert(occurrences);
    if (insErr) {
      console.error("occurrence_reinsert_failed", { event_id: ev.id });
      continue;
    }
    rematerialized++;
  }

  return json({
    ok: true,
    hidden: hiddenCount,
    reminders_sent: remindersSent,
    rematerialized,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
