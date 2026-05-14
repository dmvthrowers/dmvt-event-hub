// Mints a personal subscription token tied to an email + filters.
// POST { email, label?, filter_types?, filter_regions?, filter_cities?, filter_free_only? }
// -> { token, ics_url, webcal_url, rss_url, manage_url }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { newToken } from "../_shared/tokens.ts";
import { sendMail } from "../_shared/email.ts";
import { getSiteUrl } from "../_shared/site-url.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_BODY_BYTES = 4 * 1024; // 4 KB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SubscribeSchema = z.object({
  email: z.string().trim().email().max(255),
  label: z.string().trim().max(120).optional().nullable(),
  filter_types: z.array(z.string().trim().min(1).max(100)).max(10).optional().nullable(),
  filter_regions: z.array(z.string().trim().min(1).max(100)).max(30).optional().nullable(),
  filter_cities: z.array(z.string().trim().min(1).max(100)).max(30).optional().nullable(),
  filter_free_only: z.boolean().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(ip, "feed-subscribe", 10, 3600);
  if (!allowed) return json({ error: "rate_limited" }, 429);

  const contentLength = req.headers.get("content-length");
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413);
  }

  const requestId = crypto.randomUUID();

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, requestId);
  }

  const parsed = SubscribeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ error: "validation", details: parsed.error.flatten() }, 400, requestId);
  }
  const {
    email,
    label,
    filter_types,
    filter_regions,
    filter_cities,
    filter_free_only,
  } = parsed.data;

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = newToken(24);

    const { error } = await supabase.from("feed_subscriptions").insert({
      token,
      email: email.toLowerCase(),
      label: label ?? null,
      filter_types: filter_types ?? null,
      filter_regions: filter_regions ?? null,
      filter_cities: filter_cities ?? null,
      filter_free_only: filter_free_only ?? false,
    });
    if (error) throw error;

    const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
    const feedsBase = `https://${projectRef}.functions.supabase.co/feeds`;
    const ics_url = `${feedsBase}?token=${token}`;
    const webcal_url = `webcal://${projectRef}.functions.supabase.co/feeds?token=${token}`;
    const rss_url = `${feedsBase}?token=${token}&format=rss`;
    const manage_url = `${getSiteUrl()}/feeds/manage?token=${token}`;

    await sendMail({
      to: email,
      template: "feed-subscription-created",
      data: { ics_url, manage_url },
    });

    return json({ token, ics_url, webcal_url, rss_url, manage_url }, 200, requestId);
  } catch (e) {
    console.error(`[feed-subscribe] error [${requestId}]:`, e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500, requestId);
  }
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
