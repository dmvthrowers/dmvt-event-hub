// supabase/functions/submit-event/index.ts
// Public endpoint: accepts an event submission, creates a pending event,
// issues a verification token, and sends the verification email (stubbed).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "../_shared/cors.ts";
import { sendMail } from "../_shared/email.ts";
import { getSiteUrl } from "../_shared/site-url.ts";
import { newToken, slugify } from "../_shared/tokens.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";
import { safeString } from "../_shared/validate.ts";
import { hashToken } from "../_shared/tokens.ts";

const MAX_BODY_BYTES = 32 * 1024; // 32 KB

const EventSchema = z.object({
  title: safeString(200).pipe(z.string().min(3)),
  description: safeString(5000).pipe(z.string().min(10)),
  type: z.enum(["workshop", "meetup", "contest", "fair", "other"]),
  organizer_name: safeString(200).pipe(z.string().min(1)),
  submitter_email: z.string().trim().email().max(255),
  public_contact: safeString(500).optional().nullable(),
  venue_name: safeString(200).pipe(z.string().min(1)),
  address: safeString(500).pipe(z.string().min(3)),
  city: safeString(120).optional().nullable(),
  region: safeString(120).optional().nullable(),
  country: safeString(120).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  all_day: z.boolean(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  recurrence: z.enum(["none", "weekly", "biweekly", "monthly"]),
  recurrence_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_free: z.boolean(),
  cost_amount: z.number().min(0).max(100000).optional().nullable(),
  cost_currency: z.string().length(3).optional().nullable(),
  age_min: z.number().int().min(0).max(120).optional().nullable(),
  age_label: safeString(80).optional().nullable(),
  skill_level: z.enum(["beginner", "intermediate", "advanced", "all"]),
  capacity: z.number().int().min(1).max(100000).optional().nullable(),
  info_url: z.string().trim().url().max(500).optional().nullable(),
  image_url: z.string().trim().url().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().nullable(),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // IP-based rate limit: 5 submissions per IP per hour.
  const ip = getClientIp(req);
  const allowed = await checkRateLimit(ip, "submit-event", 5, 3600);
  if (!allowed) return json({ error: "rate_limited" }, 429);

  // Reject oversized bodies before parsing to avoid wasted work.
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413);
  }

  const requestId = crypto.randomUUID();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "validation", details: parsed.error.flatten() }, 400);
  }
  const data = parsed.data;

  if (data.website && data.website.length > 0) {
    // Honeypot tripped — silently succeed.
    return json({ ok: true });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Submitter ban check
  const submitterEmail = data.submitter_email.toLowerCase();
  const { data: existing } = await supabase
    .from("submitters")
    .select("id, banned, submission_count")
    .eq("email", submitterEmail)
    .maybeSingle();

  if (existing?.banned) {
    return json({ error: "submitter_banned" }, 403);
  }

  if (existing) {
    await supabase
      .from("submitters")
      .update({
        submission_count: (existing.submission_count ?? 0) + 1,
        name: data.organizer_name,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("submitters").insert({
      email: submitterEmail,
      name: data.organizer_name,
      submission_count: 1,
    });
  }

  const slug = `${slugify(data.title)}-${newToken(4).toLowerCase()}`;

  const insertPayload = {
    ...data,
    submitter_email: submitterEmail,
    slug,
    status: "pending" as const,
  };
  delete (insertPayload as Record<string, unknown>).website;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert(insertPayload)
    .select("id, title, slug")
    .single();

  if (eventError || !event) {
    console.error("event_insert_failed", eventError);
    return json({ error: "insert_failed", message: eventError?.message }, 400);
  }

  const verifyToken = newToken(32);
  const { error: tokError } = await supabase.from("verification_tokens").insert({
    event_id: event.id,
    token: await hashToken(verifyToken),
  });
  if (tokError) {
    console.error("token_insert_failed", tokError);
    return json({ error: "token_failed" }, 500);
  }

  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}/verify?token=${verifyToken}`;

  await sendMail({
    to: submitterEmail,
    template: "event-verification",
    data: {
      eventTitle: event.title,
      verifyUrl,
      siteUrl,
    },
  });

  return json({ ok: true, event_id: event.id }, 200, requestId);
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
