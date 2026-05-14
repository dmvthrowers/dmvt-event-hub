// supabase/functions/geocode/index.ts
//
// Thin Nominatim proxy. Routes geocoding through the server so user IPs are
// never sent to OpenStreetMap's servers. Also allows rate limiting the API.
//
// GET /geocode?q=<query>
// -> [{ display_name, lat, lon, address }]

import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = "DMVThrowers-Events/1.0 (contact@dmvthrowers.club)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET")     return json({ error: "method_not_allowed" }, 405);

  // 30 lookups per IP per minute — enough for normal usage, blocks scrapers.
  const ip = getClientIp(req);
  const allowed = await checkRateLimit(ip, "geocode", 30, 60);
  if (!allowed) return json({ error: "rate_limited" }, 429);

  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) return json([], 200);

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, "Accept-Language": "en" },
    });
    if (!res.ok) return json([], 200);

    const raw = (await res.json()) as Array<Record<string, unknown>>;
    const results = raw.map((d) => ({
      display_name: d.display_name,
      lat: Number(d.lat),
      lon: Number(d.lon),
      address: d.address ?? {},
    }));
    return json(results, 200);
  } catch {
    return json([], 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
