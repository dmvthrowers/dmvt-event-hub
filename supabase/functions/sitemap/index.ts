// Dynamic sitemap.xml — includes core pages + every published event slug.
// Cached at the edge; regenerates when events update.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SITE_URL = "https://events.dmvthrowers.club";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, if-none-match, if-modified-since",
  "Access-Control-Expose-Headers": "ETag, Last-Modified, Cache-Control",
};

const CACHE_CONTROL =
  "public, max-age=600, s-maxage=600, stale-while-revalidate=86400";

const STATIC_ROUTES: Array<{
  path: string;
  changefreq: string;
  priority: string;
}> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/events", changefreq: "hourly", priority: "0.9" },
  { path: "/subscribe", changefreq: "weekly", priority: "0.8" },
  { path: "/submit", changefreq: "monthly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
];

function escXml(s: string) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hashString(input: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: events, error } = await supabase
      .from("events")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const latest =
      events && events.length > 0
        ? new Date(
            Math.max(
              ...events.map((e: any) =>
                new Date(e.updated_at as string).getTime()
              )
            )
          )
        : new Date();
    const lastModified = latest.toUTCString();

    const urls: string[] = [];
    for (const r of STATIC_ROUTES) {
      urls.push(
        `  <url>\n` +
          `    <loc>${SITE_URL}${r.path}</loc>\n` +
          `    <changefreq>${r.changefreq}</changefreq>\n` +
          `    <priority>${r.priority}</priority>\n` +
          `  </url>`
      );
    }
    for (const e of events ?? []) {
      const slug = (e as any).slug as string;
      const updated = new Date((e as any).updated_at as string)
        .toISOString()
        .slice(0, 10);
      urls.push(
        `  <url>\n` +
          `    <loc>${SITE_URL}/events/${escXml(slug)}</loc>\n` +
          `    <lastmod>${updated}</lastmod>\n` +
          `    <changefreq>weekly</changefreq>\n` +
          `    <priority>0.7</priority>\n` +
          `  </url>`
      );
    }

    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.join("\n") +
      `\n</urlset>\n`;

    const etag = `"${hashString(body)}"`;

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ...corsHeaders,
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": CACHE_CONTROL,
        },
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        ETag: etag,
        "Last-Modified": lastModified,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (err) {
    console.error("[sitemap] error", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`,
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
});
