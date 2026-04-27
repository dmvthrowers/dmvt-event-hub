// supabase/functions/verify-event/index.ts
// Consumes a verification token, publishes the event, materializes occurrences,
// issues a manage token, and sends the "published" confirmation email.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { sendMail } from "../_shared/email-stub.ts";
import { newToken } from "../_shared/tokens.ts";

const Body = z.object({ token: z.string().min(16).max(128) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return json({ error: "validation" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: tokenRow, error: tokErr } = await supabase
    .from("verification_tokens")
    .select("id, event_id, expires_at, consumed_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (tokErr || !tokenRow) return json({ error: "invalid_token" }, 404);
  if (tokenRow.consumed_at) return json({ error: "already_used" }, 410);
  if (new Date(tokenRow.expires_at) < new Date()) return json({ error: "expired" }, 410);

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", tokenRow.event_id)
    .single();
  if (evErr || !event) return json({ error: "event_missing" }, 404);

  // Publish
  const { error: pubErr } = await supabase
    .from("events")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", event.id);
  if (pubErr) return json({ error: "publish_failed", message: pubErr.message }, 500);

  // Mark token consumed
  await supabase
    .from("verification_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  // Materialize occurrences
  await materializeOccurrences(supabase, event);

  // Issue manage token
  const manageToken = newToken(32);
  await supabase.from("manage_tokens").insert({
    event_id: event.id,
    token: manageToken,
  });

  const origin = req.headers.get("origin") || "";
  const manageUrl = origin
    ? `${origin}/manage?token=${manageToken}`
    : `/manage?token=${manageToken}`;

  await sendMail({
    to: event.submitter_email,
    template: "event-published",
    data: {
      eventTitle: event.title,
      manageUrl,
      siteUrl: origin,
    },
  });

  return json({
    ok: true,
    event_id: event.id,
    slug: event.slug,
    manage_url: manageUrl,
  });
});

async function materializeOccurrences(
  supabase: ReturnType<typeof createClient>,
  event: Record<string, any>,
) {
  // Clear any existing occurrences first
  await supabase.from("event_occurrences").delete().eq("event_id", event.id);

  const startDate = new Date(`${event.start_date}T00:00:00Z`);
  const endDate = new Date(`${event.end_date}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.round((endDate.getTime() - startDate.getTime()) / dayMs);

  const buildOccurrence = (occStart: Date) => {
    const occEnd = new Date(occStart.getTime() + spanDays * dayMs);
    let startAt: Date;
    let endAt: Date;
    if (event.all_day) {
      startAt = new Date(`${ymd(occStart)}T00:00:00Z`);
      endAt = new Date(`${ymd(occEnd)}T23:59:59Z`);
    } else {
      startAt = new Date(`${ymd(occStart)}T${event.start_time}Z`);
      endAt = new Date(`${ymd(occEnd)}T${event.end_time}Z`);
    }
    return {
      event_id: event.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: event.all_day,
    };
  };

  const occurrences: ReturnType<typeof buildOccurrence>[] = [];
  if (event.recurrence === "none") {
    occurrences.push(buildOccurrence(startDate));
  } else {
    const until = new Date(`${event.recurrence_until}T00:00:00Z`);
    const stepDays =
      event.recurrence === "weekly" ? 7 : event.recurrence === "biweekly" ? 14 : 0;
    let cursor = new Date(startDate);
    let safety = 0;
    while (cursor <= until && safety < 400) {
      occurrences.push(buildOccurrence(cursor));
      if (event.recurrence === "monthly") {
        cursor = new Date(cursor);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      } else {
        cursor = new Date(cursor.getTime() + stepDays * dayMs);
      }
      safety++;
    }
  }

  if (occurrences.length) {
    await supabase.from("event_occurrences").insert(occurrences);
  }
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
