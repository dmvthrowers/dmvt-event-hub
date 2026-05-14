// supabase/functions/renew-event/index.ts
//
// Public endpoint hit by the renewal-reminder email. Validates a one-time
// renew token and extends the event's `expires_at` by 1 year. Resets the
// reminder so the next pre-expiry window will email again.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { hashToken } from "../_shared/tokens.ts";

const Schema = z.object({
  token: z.string().min(20).max(128),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return json({ error: "validation" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: tok, error: tokErr } = await supabase
    .from("renew_tokens")
    .select("id, event_id, consumed_at, expires_at")
    .eq("token", await hashToken(parsed.data.token))
    .maybeSingle();

  if (tokErr || !tok) return json({ error: "invalid_token" }, 404);
  if (tok.consumed_at) return json({ error: "already_used" }, 410);
  if (new Date(tok.expires_at) < new Date()) return json({ error: "expired" }, 410);

  // Extend the event's expires_at by 1 year and clear the reminder flag.
  const newExpires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data: ev, error: evErr } = await supabase
    .from("events")
    .update({
      expires_at: newExpires,
      renewal_reminder_sent_at: null,
      auto_hidden_at: null,
      // If the event was auto-hidden because it just expired, republish it.
      status: "published",
    })
    .eq("id", tok.event_id)
    .select("id, slug, title, expires_at")
    .single();

  if (evErr || !ev) return json({ error: "update_failed" }, 500);

  await supabase
    .from("renew_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", tok.id);

  return json({
    ok: true,
    slug: ev.slug,
    title: ev.title,
    expires_at: ev.expires_at,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
