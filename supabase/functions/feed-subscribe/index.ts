// Mints a personal subscription token tied to an email + filters.
// POST { email, label?, filter_types?, filter_regions?, filter_cities?, filter_free_only? }
// -> { token, ics_url, webcal_url, rss_url, manage_url }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { newToken } from "../_shared/tokens.ts";
import { sendMail } from "../_shared/email-stub.ts";
import { getSiteUrl } from "../_shared/site-url.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 255;
}
function strList(v: unknown, max = 30): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v
    .filter((x) => typeof x === "string")
    .map((x) => (x as string).trim())
    .filter((x) => x.length > 0 && x.length <= 100)
    .slice(0, max);
  return out.length ? out : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, label } = body;
    if (!isEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = newToken(24);
    const filter_types = strList(body.filter_types, 10);
    const filter_regions = strList(body.filter_regions, 30);
    const filter_cities = strList(body.filter_cities, 30);
    const filter_free_only = body.filter_free_only === true;

    const { error } = await supabase.from("feed_subscriptions").insert({
      token,
      email: email.toLowerCase(),
      label: typeof label === "string" ? label.slice(0, 120) : null,
      filter_types,
      filter_regions,
      filter_cities,
      filter_free_only,
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

    return new Response(
      JSON.stringify({ token, ics_url, webcal_url, rss_url, manage_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("feed-subscribe error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
