// supabase/functions/admin-action/index.ts
//
// Server-side wrapper for admin mutations. Verifies the caller holds an admin
// role via their JWT before executing and logs every action to audit_log.
//
// POST (Authorization: Bearer <access_token>)
// body: { action, event_id?, report_id? }
//
// Actions:
//   publish_event      — event_id required
//   hide_event         — event_id required
//   resolve_report     — report_id required
//   dismiss_report     — report_id required
//   hide_event_and_resolve — event_id + report_id required

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { getClientIp } from "../_shared/rate-limit.ts";
import { logAudit } from "../_shared/audit.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = () => z.string().regex(UUID_RE, "Invalid UUID");

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish_event"),          event_id: uuid() }),
  z.object({ action: z.literal("hide_event"),             event_id: uuid() }),
  z.object({ action: z.literal("resolve_report"),         report_id: uuid() }),
  z.object({ action: z.literal("dismiss_report"),         report_id: uuid() }),
  z.object({ action: z.literal("hide_event_and_resolve"), event_id: uuid(), report_id: uuid() }),
]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const requestId = crypto.randomUUID();
  const ip = getClientIp(req);

  // --- Auth: verify JWT and admin role ---
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!accessToken) return json({ error: "unauthorized" }, 401, requestId);

  // Use the user's JWT with the anon key so RLS applies for the role check.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "unauthorized" }, 401, requestId);

  const { data: roleRow } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "forbidden" }, 403, requestId);

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, requestId);
  }
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "validation", details: parsed.error.flatten() }, 400, requestId);
  }
  const input = parsed.data;

  // Service-role client for actual mutations.
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  const actorEmail = user.email ?? user.id;

  // --- Execute ---
  if (input.action === "publish_event") {
    const { error } = await svc.from("events")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", input.event_id);
    if (error) return json({ error: "update_failed" }, 500, requestId);
    await logAudit(svc, { actor_id: user.id, actor_email: actorEmail, action: "publish_event",
      target_type: "event", target_id: input.event_id, ip });
    return json({ ok: true }, 200, requestId);
  }

  if (input.action === "hide_event") {
    const { error } = await svc.from("events").update({ status: "hidden" }).eq("id", input.event_id);
    if (error) return json({ error: "update_failed" }, 500, requestId);
    await logAudit(svc, { actor_id: user.id, actor_email: actorEmail, action: "hide_event",
      target_type: "event", target_id: input.event_id, ip });
    return json({ ok: true }, 200, requestId);
  }

  if (input.action === "resolve_report") {
    const { error } = await svc.from("reports").update({ status: "resolved" }).eq("id", input.report_id);
    if (error) return json({ error: "update_failed" }, 500, requestId);
    await logAudit(svc, { actor_id: user.id, actor_email: actorEmail, action: "resolve_report",
      target_type: "report", target_id: input.report_id, ip });
    return json({ ok: true }, 200, requestId);
  }

  if (input.action === "dismiss_report") {
    const { error } = await svc.from("reports").update({ status: "dismissed" }).eq("id", input.report_id);
    if (error) return json({ error: "update_failed" }, 500, requestId);
    await logAudit(svc, { actor_id: user.id, actor_email: actorEmail, action: "dismiss_report",
      target_type: "report", target_id: input.report_id, ip });
    return json({ ok: true }, 200, requestId);
  }

  if (input.action === "hide_event_and_resolve") {
    const [evErr, repErr] = await Promise.all([
      svc.from("events").update({ status: "hidden" }).eq("id", input.event_id).then(r => r.error),
      svc.from("reports").update({ status: "resolved" }).eq("id", input.report_id).then(r => r.error),
    ]);
    if (evErr || repErr) return json({ error: "update_failed" }, 500, requestId);
    await logAudit(svc, { actor_id: user.id, actor_email: actorEmail, action: "hide_event_and_resolve",
      target_type: "event", target_id: input.event_id, ip,
      metadata: { report_id: input.report_id } });
    return json({ ok: true }, 200, requestId);
  }

  return json({ error: "unknown_action" }, 400, requestId);
});

function json(payload: unknown, status = 200, requestId?: string) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}
