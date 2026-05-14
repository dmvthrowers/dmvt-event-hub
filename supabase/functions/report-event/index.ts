// supabase/functions/report-event/index.ts
//
// Accepts a user report about a published event. Moves this logic out of the
// browser (where it previously wrote directly with the anon key) so we can
// enforce rate limiting and server-side validation.
//
// POST { event_id, reason, details, reporter_email? }
// -> { ok: true }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const MAX_BODY_BYTES = 8 * 1024; // 8 KB

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_REASONS = [
  "Spam or misleading",
  "Event has been cancelled",
  "Wrong location or date",
  "Inappropriate content",
  "Duplicate listing",
  "Other",
] as const;

const ReportSchema = z.object({
  event_id: z.string().regex(UUID_RE, "Invalid event ID"),
  reason: z.enum(VALID_REASONS),
  details: z.string().trim().min(10).max(2000),
  reporter_email: z.string().trim().email().max(255).optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 5 reports per IP per hour — prevents report-flooding
  const ip = getClientIp(req);
  const allowed = await checkRateLimit(ip, "report-event", 5, 3600);
  if (!allowed) return json({ error: "rate_limited" }, 429);

  const contentLength = req.headers.get("content-length");
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413);
  }

  const requestId = crypto.randomUUID();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, requestId);
  }

  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "validation", details: parsed.error.flatten() }, 400, requestId);
  }
  const { event_id, reason, details, reporter_email } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Confirm the event exists and is published before accepting the report.
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", event_id)
    .eq("status", "published")
    .maybeSingle();

  if (!event) {
    return json({ error: "event_not_found" }, 404, requestId);
  }

  const fullReason = `[${reason}] ${details}`;
  const { error } = await supabase.from("reports").insert({
    event_id,
    reason: fullReason,
    reporter_email: reporter_email?.toLowerCase() ?? null,
    reporter_ip: ip !== "unknown" ? ip : null,
    status: "open",
  });

  if (error) {
    console.error(`[report-event] insert failed [${requestId}]:`, error);
    return json({ error: "insert_failed" }, 500, requestId);
  }

  console.log(`[report-event] report submitted [${requestId}] event=${event_id} reason="${reason}"`);
  return json({ ok: true }, 200, requestId);
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
