import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Printer, Copy, Check, Share2, Loader2 } from "lucide-react";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPE_LABEL, type EventType } from "@/lib/events";

type Filters = {
  types: Set<EventType>;
  regions: Set<string>;
  cities: Set<string>;
  freeOnly: boolean;
};

type TimelineRow = {
  occurrenceId: string;
  start: Date;
  end: Date;
  allDay: boolean;
  title: string;
  slug: string;
  type: EventType;
  venue: string;
  city: string | null;
  region: string | null;
  isFree: boolean;
};

type EventJoinRow = {
  title: string;
  slug: string;
  type: EventType;
  venue_name: string;
  city: string | null;
  region: string | null;
  is_free: boolean;
  status: string;
};

type OccurrenceJoinRow = {
  id: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  events: EventJoinRow | EventJoinRow[] | null;
};

type ShareCapableNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

function getJoinedEvent(events: OccurrenceJoinRow["events"]): EventJoinRow | null {
  if (!events) return null;
  return Array.isArray(events) ? events[0] ?? null : events;
}

/**
 * Compact "next 30 days" timeline. Mirrors the SubscribeFeeds filters so the
 * preview matches what a subscriber would actually receive in their calendar.
 *
 * Export options:
 *   - Print → uses window.print() with a print stylesheet so the user can
 *     save as PDF from the browser dialog (no PDF dependency needed).
 *   - Copy → plain-text summary suitable for Slack / Discord / email.
 *   - Share → Web Share API where available, falls back to copy.
 */
export const TimelineSummary = ({ filters }: { filters: Filters }) => {
  const [rows, setRows] = useState<TimelineRow[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    (async () => {
      const now = new Date();
      const horizon = addDays(now, 30);

      let q = supabase
        .from("event_occurrences")
        .select(
          `id, start_at, end_at, all_day,
           events!inner ( title, slug, type, venue_name, city, region, is_free, status )`
        )
        .gte("start_at", now.toISOString())
        .lte("start_at", horizon.toISOString())
        .eq("events.status", "published")
        .order("start_at", { ascending: true })
        .limit(200);

      if (filters.types.size > 0 && filters.types.size < 3) {
        q = q.in("events.type", [...filters.types]);
      }
      if (filters.freeOnly) q = q.eq("events.is_free", true);

      const { data, error } = await q;
      if (cancelled) return;
      if (error || !data) {
        setRows([]);
        return;
      }

      const lc = (s: string | null | undefined) =>
        (s ?? "").trim().toLowerCase();
      const regionSet =
        filters.regions.size > 0
          ? new Set([...filters.regions].map((s) => s.toLowerCase()))
          : null;
      const citySet =
        filters.cities.size > 0
          ? new Set([...filters.cities].map((s) => s.toLowerCase()))
          : null;

      const mapped: TimelineRow[] = [];
      for (const r of (data as OccurrenceJoinRow[])) {
        const e = getJoinedEvent(r.events);
        if (!e) continue;
        if (regionSet && !regionSet.has(lc(e.region))) continue;
        if (citySet && !citySet.has(lc(e.city))) continue;
        mapped.push({
          occurrenceId: r.id,
          start: parseISO(r.start_at),
          end: parseISO(r.end_at),
          allDay: r.all_day,
          title: e.title,
          slug: e.slug,
          type: e.type,
          venue: e.venue_name,
          city: e.city,
          region: e.region,
          isFree: e.is_free,
        });
      }
      setRows(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Group occurrences by calendar day for a clean visual timeline.
  const grouped = useMemo(() => {
    const out: { day: Date; items: TimelineRow[] }[] = [];
    for (const row of rows ?? []) {
      const last = out[out.length - 1];
      if (last && isSameDay(last.day, row.start)) {
        last.items.push(row);
      } else {
        out.push({ day: row.start, items: [row] });
      }
    }
    return out;
  }, [rows]);

  const plainText = useMemo(() => {
    if (!rows) return "";
    const header = `YoYo Events — next 30 days${filterSummary(filters)}`;
    const underline = "=".repeat(header.length);
    if (rows.length === 0) {
      return `${header}\n${underline}\n\nNo matching events in the next 30 days.\n`;
    }
    const lines = [header, underline, ""];
    for (const block of grouped) {
      lines.push(format(block.day, "EEE, MMM d"));
      for (const it of block.items) {
        const time = it.allDay ? "all day" : format(it.start, "h:mm a");
        const where = [it.venue, it.city, it.region].filter(Boolean).join(", ");
        const cost = it.isFree ? " · free" : "";
        lines.push(
          `  • ${time} — ${it.title} [${EVENT_TYPE_LABEL[it.type]}${cost}] — ${where}`
        );
      }
      lines.push("");
    }
    return lines.join("\n");
  }, [rows, grouped, filters]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async () => {
    const nav = navigator as ShareCapableNavigator;
    if (typeof navigator !== "undefined" && typeof nav.share === "function") {
      try {
        await nav.share({
          title: "YoYo Events — next 30 days",
          text: plainText,
        });
        return;
      } catch {
        /* user cancelled or unsupported */
      }
    }
    await copy();
  };

  const print = () => window.print();

  return (
    <section className="border-t border-hairline/70 bg-cream p-6 md:p-8 print:border-0 print:bg-white print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="label-caps inline-flex items-center gap-2 text-red">
            <CalendarRange className="h-3.5 w-3.5" /> Next 30 days
          </p>
          <h3 className="mt-1 font-display text-xl text-navy">
            Timeline preview
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            What a subscriber would see for the current filters. Save it as a
            PDF, share it, or paste into a chat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={print}
            className="label-caps inline-flex items-center gap-1.5 border border-navy px-3 py-2 text-navy hover:bg-navy hover:text-cream"
          >
            <Printer className="h-3.5 w-3.5" /> Save as PDF
          </button>
          <button
            type="button"
            onClick={copy}
            className="label-caps inline-flex items-center gap-1.5 border border-navy px-3 py-2 text-navy hover:bg-navy hover:text-cream"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy text"}
          </button>
          <button
            type="button"
            onClick={share}
            className="label-caps inline-flex items-center gap-1.5 bg-red px-3 py-2 text-cream hover:bg-red-dark"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>

      <div
        id="timeline-summary-print"
        className="mt-5 border border-hairline/70 bg-cream-mid print:mt-0 print:border-0 print:bg-white"
      >
        {/* Print-only header (lives inside the print region) */}
        <div className="hidden p-4 print:block">
          <h1 className="font-display text-2xl text-navy">
            YoYo Events — next 30 days
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), "MMMM d, yyyy")}
            {filterSummary(filters)}
          </p>
        </div>
        {rows === null ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No matching events in the next 30 days. Try widening your filters.
          </div>
        ) : (
          <ul className="divide-y divide-hairline/60">
            {grouped.map((block) => (
              <li
                key={block.day.toISOString()}
                className="grid gap-3 p-4 md:grid-cols-[140px_1fr] md:gap-6 md:p-5 print:break-inside-avoid"
              >
                <div>
                  <p className="label-caps text-red">
                    {format(block.day, "EEE")}
                  </p>
                  <p className="font-display text-2xl text-navy">
                    {format(block.day, "MMM d")}
                  </p>
                </div>
                <ul className="space-y-3">
                  {block.items.map((it) => (
                    <li
                      key={it.occurrenceId}
                      className="flex flex-col gap-1 border-l-2 border-red/70 pl-3"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="label-caps text-navy">
                          {it.allDay ? "All day" : format(it.start, "h:mm a")}
                        </span>
                        <span className="font-display text-lg text-navy">
                          {it.title}
                        </span>
                        <span className="label-caps inline-flex items-center gap-1 text-muted-foreground">
                          {EVENT_TYPE_LABEL[it.type]}
                          {it.isFree && <span className="text-red">· free</span>}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[it.venue, it.city, it.region]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

function filterSummary(filters: Filters): string {
  const parts: string[] = [];
  if (filters.types.size > 0 && filters.types.size < 3) {
    parts.push([...filters.types].map((t) => EVENT_TYPE_LABEL[t]).join("/"));
  }
  if (filters.regions.size > 0) parts.push([...filters.regions].join("/"));
  if (filters.cities.size > 0) parts.push([...filters.cities].join("/"));
  if (filters.freeOnly) parts.push("free");
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}
