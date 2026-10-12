// supabase/functions/verify-event/index.ts
// Consumes a verification token, publishes the event, materializes occurrences,
// issues a manage token, and sends the "published" confirmation email.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { buildOccurrences } from "../_shared/occurrences.ts";
import { sendMail } from "../_shared/email.ts";
import { getSiteUrl } from "../_shared/site-url.ts";
import { newToken, hashToken } from "../_shared/tokens.ts";

const Body = z.object({ token: z.string().min(16).max(128) });

type ManagedEvent = {
  id: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  recurrence: "none" | "weekly" | "biweekly" | "monthly" | "monthly_by_weekday";
  recurrence_until: string | null;
};

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
    .eq("token", await hashToken(parsed.data.token))
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
    token: await hashToken(manageToken),
  });

  const siteUrl = getSiteUrl();
  const manageUrl = `${siteUrl}/manage?token=${manageToken}`;

  await sendMail({
    to: event.submitter_email,
    template: "event-published",
    data: {
      eventTitle: event.title,
      manageUrl,
      siteUrl,
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
  event: ManagedEvent,
) {
  // Clear any existing occurrences first, then rebuild from the shared generator
  // (nth-weekday monthly, America/New_York wall-clock times).
  await supabase.from("event_occurrences").delete().eq("event_id", event.id);
  const occurrences = buildOccurrences(event);
  if (occurrences.length) {
    const { error } = await supabase.from("event_occurrences").insert(occurrences);
    if (error) console.error("occurrence_insert_failed", { event_id: event.id });
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
