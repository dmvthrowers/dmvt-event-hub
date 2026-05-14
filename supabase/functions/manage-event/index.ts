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

const UpdatePatch = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  venue_name: z.string().trim().min(1).max(200).optional(),
  address: z.string().trim().min(3).max(500).optional(),
  city: z.string().trim().max(120).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
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
  public_contact: z.string().trim().max(500).nullable().optional(),
});

type ManagedEvent = {
  id: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  recurrence: "none" | "weekly" | "biweekly" | "monthly";
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
    await supabase.from("events").update({ status: "cancelled" }).eq("id", event.id);
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
    .eq("token", token)
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
  const dayMs = 24 * 60 * 60 * 1000;
  const startDate = new Date(`${event.start_date}T00:00:00Z`);
  const endDate = new Date(`${event.end_date}T00:00:00Z`);
  const spanDays = Math.round((endDate.getTime() - startDate.getTime()) / dayMs);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const build = (occStart: Date) => {
    const occEnd = new Date(occStart.getTime() + spanDays * dayMs);
    const startAt = event.all_day
      ? new Date(`${ymd(occStart)}T00:00:00Z`)
      : new Date(`${ymd(occStart)}T${event.start_time}Z`);
    const endAt = event.all_day
      ? new Date(`${ymd(occEnd)}T23:59:59Z`)
      : new Date(`${ymd(occEnd)}T${event.end_time}Z`);
    return {
      event_id: event.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: event.all_day,
    };
  };
  const occs: ReturnType<typeof build>[] = [];
  if (event.recurrence === "none") {
    occs.push(build(startDate));
  } else {
    const until = new Date(`${event.recurrence_until}T00:00:00Z`);
    const step = event.recurrence === "weekly" ? 7 : event.recurrence === "biweekly" ? 14 : 0;
    let cur = new Date(startDate);
    let i = 0;
    while (cur <= until && i < 400) {
      occs.push(build(cur));
      if (event.recurrence === "monthly") {
        cur = new Date(cur);
        cur.setUTCMonth(cur.getUTCMonth() + 1);
      } else cur = new Date(cur.getTime() + step * dayMs);
      i++;
    }
  }
  if (occs.length) await supabase.from("event_occurrences").insert(occs);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
