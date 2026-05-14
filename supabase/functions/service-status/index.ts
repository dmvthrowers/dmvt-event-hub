// Aggregates live status from each vendor's public statuspage.io JSON feed.
// Called by the SPA's /status page so user IPs never hit third-party CDNs.
// Cached for 5 minutes via Cache-Control; Vercel CDN reuses the response.
//
// GET /service-status
// -> { services: ServiceStatus[], cached_at: string }

import { corsHeaders } from "../_shared/cors.ts";

type StatusLevel = "operational" | "degraded" | "outage" | "unknown";

interface ServiceStatus {
  name: string;
  category: string;
  level: StatusLevel;
  label: string | null;
  updated_at: string | null;
  status_url: string;
}

const SERVICES = [
  { name: "Vercel",    category: "Core app",       statusUrl: "https://www.vercel-status.com/",        apiUrl: "https://www.vercel-status.com/api/v2/status.json" },
  { name: "Supabase",  category: "Core app",       statusUrl: "https://status.supabase.com/",          apiUrl: "https://status.supabase.com/api/v2/status.json" },
  { name: "Resend",    category: "Email delivery", statusUrl: "https://resend-status.com/",            apiUrl: null },
  { name: "Cloudflare",category: "Infrastructure", statusUrl: "https://www.cloudflarestatus.com/",     apiUrl: "https://www.cloudflarestatus.com/api/v2/status.json" },
  { name: "GitHub",    category: "Infrastructure", statusUrl: "https://www.githubstatus.com/",         apiUrl: "https://www.githubstatus.com/api/v2/status.json" },
  { name: "Nominatim", category: "Mapping",        statusUrl: "https://nominatim.openstreetmap.org/",  apiUrl: null },
  { name: "CARTO",     category: "Mapping",        statusUrl: "https://status.carto.com/",             apiUrl: null },
];

function mapIndicator(indicator: string | null | undefined): StatusLevel {
  switch (indicator) {
    case "none":
    case "operational": return "operational";
    case "minor":
    case "degraded_performance": return "degraded";
    case "major":
    case "partial_outage":
    case "critical":
    case "major_outage":
    case "maintenance": return "outage";
    default: return "unknown";
  }
}

async function fetchOne(apiUrl: string): Promise<{ level: StatusLevel; label: string | null; updated_at: string | null }> {
  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { level: "unknown", label: null, updated_at: null };
    const data = await res.json() as Record<string, unknown>;
    const status = data?.status as Record<string, unknown> | undefined;
    return {
      level: mapIndicator(status?.indicator as string),
      label: (status?.description as string) ?? null,
      updated_at: (data?.page as Record<string, unknown>)?.updated_at as string ?? null,
    };
  } catch {
    return { level: "unknown", label: null, updated_at: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const results = await Promise.all(
    SERVICES.map(async (svc): Promise<ServiceStatus> => {
      const live = svc.apiUrl ? await fetchOne(svc.apiUrl) : null;
      return {
        name: svc.name,
        category: svc.category,
        level: live?.level ?? "unknown",
        label: live?.label ?? null,
        updated_at: live?.updated_at ?? null,
        status_url: svc.statusUrl,
      };
    })
  );

  return new Response(
    JSON.stringify({ services: results, cached_at: new Date().toISOString() }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // 5-minute shared cache — calendar apps and CDN reuse the response.
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
});
