// supabase/functions/manage-event/index.ts
// Magic-link management: load event details, update content, or cancel.
//
// Actions:
//   GET  ?token=...          → returns full event payload
//   POST { token, action: "cancel" }
//   POST { token, action: "update", patch: {...allowed fields} }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { buildOccurrences } from "../_shared/occurrences.ts";
import { safeString } from "../_shared/validate.ts";
import { hashToken } from "../_shared/tokens.ts";

const UpdatePatch = z.object({
  title: safeString(200).pipe(z.string().min(3)).optional(),
  description: safeString(5000).pipe(z.string().min(10)).optional(),
  venue_name: safeString(200).pipe(z.string().min(1)).optional(),
  address: safeString(500).pipe(z.string().min(3)).optional(),
  city: safeString(120).nullable().optional(),
  region: safeString(120).nullable().optional(),
  country: safeString(120).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  all_day: z.boolean().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  is_free: z.boolean().optional(),
  cost_amount: z.number().min(0).max(100000).nullable().optional(),
  info_url: z.string().trim().url().max(500).nullable().optional(),
  image_url: z.string().trim().url().max(500).nullable().optional(),
  public_contact: safeString(500).nullable().optional(),
});

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "missing_token" }, 400);
    const event = await loadEventByToken(supabase, token);
    if (!event) return json({ error: "invalid_token" }, 404);
    return json({ ok: true, event });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "invalid_json" }, 400);

  const token = String(body.token ?? "");
  if (!token) return json({ error: "missing_token" }, 400);

  const event = await loadEventByToken(supabase, token);
  if (!event) return json({ error: "invalid_token" }, 404);

  if (body.action === "cancel") {
    // event_status has no "cancelled" value; "hidden" takes the event off every public
    // view and out of daily-maintenance's re-materialize query (status = 'published').
    const { error: cancelErr } = await supabase
      .from("events")
      .update({ status: "hidden" })
      .eq("id", event.id);
    if (cancelErr) return json({ error: "cancel_failed", message: cancelErr.message }, 400);
    await supabase.from("event_occurrences").delete().eq("event_id", event.id);
    return json({ ok: true, status: "cancelled" });
  }

  if (body.action === "update") {
    const parsed = UpdatePatch.safeParse(body.patch);
    if (!parsed.success) {
      return json({ error: "validation", details: parsed.error.flatten() }, 400);
    }
    const { error } = await supabase.from("events").update(parsed.data).eq("id", event.id);
    if (error) return json({ error: "update_failed", message: error.message }, 400);

    // Re-materialize if scheduling fields changed
    const reschedKeys = ["start_date","end_date","all_day","start_time","end_time"];
    if (reschedKeys.some((k) => k in parsed.data)) {
      const { data: fresh } = await supabase
        .from("events")
        .select("*")
        .eq("id", event.id)
        .single();
      if (fresh) await rebuildOccurrences(supabase, fresh);
    }
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});

async function loadEventByToken(
  supabase: ReturnType<typeof createClient>,
  token: string,
) {
  const { data: tok } = await supabase
    .from("manage_tokens")
    .select("event_id, revoked_at")
    .eq("token", await hashToken(token))
    .maybeSingle();
  if (!tok || tok.revoked_at) return null;
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", tok.event_id)
    .single();
  return event;
}

async function rebuildOccurrences(
  supabase: ReturnType<typeof createClient>,
  event: ManagedEvent,
) {
  await supabase.from("event_occurrences").delete().eq("event_id", event.id);
  const occs = buildOccurrences(event);
  if (occs.length) {
    const { error } = await supabase.from("event_occurrences").insert(occs);
    if (error) console.error("occurrence_insert_failed", { event_id: event.id });
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
