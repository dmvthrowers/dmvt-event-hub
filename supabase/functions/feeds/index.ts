// Public feeds: iCalendar (.ics) + RSS 2.0
// Routes:
//   GET /feeds            -> ICS (default)
//   GET /feeds?format=ics -> ICS
//   GET /feeds?format=rss -> RSS
//   GET /feeds.ics        -> ICS
//   GET /feeds.rss        -> RSS
//
// No auth required. Caches for 10 minutes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toIcsUtc(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}
function toIcsDate(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate())
  );
}
function escIcs(s: string) {
  return (s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
function escXml(s: string) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Row = {
  id: string;
  title: string;
  slug: string;
  description: string;
  venue_name: string;
  address: string;
  city: string | null;
  region: string | null;
  info_url: string | null;
  type: string;
  published_at: string | null;
  occurrences: {
    id: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
  }[];
};

async function loadEvents(): Promise<Row[]> {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const nowIso = new Date().toISOString();
  // Pull next 12 months of occurrences for published events
  const { data, error } = await supabase
    .from("event_occurrences")
    .select(
      `id, start_at, end_at, all_day, event_id,
       events!inner ( id, title, slug, description, venue_name, address, city, region, info_url, type, status, published_at )`
    )
    .gte("start_at", nowIso)
    .lte(
      "start_at",
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    )
    .order("start_at", { ascending: true })
    .limit(500);

  if (error) throw error;

  const grouped = new Map<string, Row>();
  for (const r of data ?? []) {
    const e = (r as any).events;
    if (!e || e.status !== "published") continue;
    if (!grouped.has(e.id)) {
      grouped.set(e.id, {
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description,
        venue_name: e.venue_name,
        address: e.address,
        city: e.city,
        region: e.region,
        info_url: e.info_url,
        type: e.type,
        published_at: e.published_at,
        occurrences: [],
      });
    }
    grouped.get(e.id)!.occurrences.push({
      id: r.id,
      start_at: r.start_at,
      end_at: r.end_at,
      all_day: r.all_day,
    });
  }
  return [...grouped.values()];
}

function buildIcs(rows: Row[], siteUrl: string) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YoYo Events//Community Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:YoYo Events",
    "X-WR-CALDESC:Community-built calendar of yo-yo and skill toy events",
  ];
  const stamp = toIcsUtc(new Date());
  for (const ev of rows) {
    for (const o of ev.occurrences) {
      const start = new Date(o.start_at);
      const end = new Date(o.end_at);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${o.id}@yoyo-events`);
      lines.push(`DTSTAMP:${stamp}`);
      if (o.all_day) {
        lines.push(`DTSTART;VALUE=DATE:${toIcsDate(start)}`);
        const endDay = new Date(end);
        endDay.setUTCDate(endDay.getUTCDate() + 1);
        lines.push(`DTEND;VALUE=DATE:${toIcsDate(endDay)}`);
      } else {
        lines.push(`DTSTART:${toIcsUtc(start)}`);
        lines.push(`DTEND:${toIcsUtc(end)}`);
      }
      lines.push(`SUMMARY:${escIcs(ev.title)}`);
      lines.push(`DESCRIPTION:${escIcs(ev.description)}`);
      const loc = [ev.venue_name, ev.address, ev.city, ev.region]
        .filter(Boolean)
        .join(", ");
      lines.push(`LOCATION:${escIcs(loc)}`);
      lines.push(`URL:${siteUrl}/events/${ev.slug}`);
      lines.push(`CATEGORIES:${escIcs(ev.type)}`);
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function buildRss(rows: Row[], siteUrl: string) {
  const items = rows
    .map((ev) => {
      const next = ev.occurrences[0];
      if (!next) return "";
      const link = `${siteUrl}/events/${ev.slug}`;
      const pubDate = new Date(ev.published_at ?? next.start_at).toUTCString();
      const when = new Date(next.start_at).toUTCString();
      const where = [ev.venue_name, ev.city, ev.region]
        .filter(Boolean)
        .join(", ");
      const desc = `${ev.description}\n\nWhen: ${when}\nWhere: ${where}`;
      return `    <item>
      <title>${escXml(ev.title)}</title>
      <link>${escXml(link)}</link>
      <guid isPermaLink="true">${escXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escXml(ev.type)}</category>
      <description>${escXml(desc)}</description>
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>YoYo Events</title>
    <link>${escXml(siteUrl)}</link>
    <atom:link href="${escXml(siteUrl)}/feeds.rss" rel="self" type="application/rss+xml" />
    <description>Community-built calendar of yo-yo and skill toy events.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.toLowerCase();
    const fmtParam = (url.searchParams.get("format") || "").toLowerCase();
    const isRss =
      fmtParam === "rss" || path.endsWith(".rss") || path.endsWith("/rss");
    const siteUrl =
      url.searchParams.get("site") ||
      req.headers.get("origin") ||
      "https://events.dmvthrowers.club";

    const rows = await loadEvents();

    if (isRss) {
      return new Response(buildRss(rows, siteUrl), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=600",
        },
      });
    }

    return new Response(buildIcs(rows, siteUrl), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=600",
        "Content-Disposition": 'inline; filename="yoyo-events.ics"',
      },
    });
  } catch (e) {
    console.error("feeds error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
