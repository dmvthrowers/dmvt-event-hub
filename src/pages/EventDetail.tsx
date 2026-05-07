import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  ExternalLink,
  Flag,
  Loader2,
  MapPin,
  Share2,
  Users,
} from "lucide-react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  EVENT_TYPE_LABEL,
  formatCost,
  formatLocation,
  formatOccurrenceWhen,
  typeBadgeClass,
  typeSolidBgClass,
  type EventType,
  type OccurrenceWithEvent,
} from "@/lib/events";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EventDetailRow {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  description: string;
  venue_name: string;
  address: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_free: boolean;
  cost_amount: number | null;
  cost_currency: string | null;
  organizer_name: string;
  skill_level: string;
  age_label: string | null;
  image_url: string | null;
  info_url: string | null;
  public_contact: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  recurrence: string;
  occurrences: Array<{
    id: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
  }>;
}

async function fetchEventBySlug(slug: string): Promise<EventDetailRow | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      `id, slug, title, type, description, venue_name, address, city, region, country,
       latitude, longitude, is_free, cost_amount, cost_currency, organizer_name,
       skill_level, age_label, image_url, info_url, public_contact, all_day,
       start_time, end_time, recurrence,
       occurrences:event_occurrences(id, start_at, end_at, all_day)`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as EventDetailRow) ?? null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsUtc(d: Date): string {
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

function toIcsDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate())
  );
}

function buildIcs(event: EventDetailRow): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DMV Throwers//Events//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const o of event.occurrences) {
    const start = new Date(o.start_at);
    const end = new Date(o.end_at);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${o.id}@events.dmvthrowers.club`);
    lines.push(`DTSTAMP:${toIcsUtc(new Date())}`);
    if (o.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(start)}`);
      const endDay = new Date(end);
      endDay.setUTCDate(endDay.getUTCDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(endDay)}`);
    } else {
      lines.push(`DTSTART:${toIcsUtc(start)}`);
      lines.push(`DTEND:${toIcsUtc(end)}`);
    }
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
    lines.push(
      `LOCATION:${escapeIcs(`${event.venue_name}, ${event.address}`)}`
    );
    if (event.info_url) lines.push(`URL:${event.info_url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export const EventDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [showAllDates, setShowAllDates] = useState(false);

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => fetchEventBySlug(slug!),
    enabled: !!slug,
  });

  // Fix Leaflet icon
  useEffect(() => {
    // @ts-expect-error -- delete private prop
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const upcoming = useMemo(() => {
    if (!event) return [] as EventDetailRow["occurrences"];
    const now = Date.now();
    return [...event.occurrences]
      .filter((o) => new Date(o.end_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [event]);

  const downloadIcs = () => {
    if (!event) return;
    const ics = buildIcs(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <Seo title="Loading event… — YoYo Events" description="Loading event details." path={`/events/${slug ?? ""}`} noIndex />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-red" />
        </div>
      </SiteLayout>
    );
  }

  if (isError || !event) {
    return (
      <SiteLayout>
        <Seo title="Event not found — YoYo Events" description="This event may have been removed or is no longer published." path={`/events/${slug ?? ""}`} noIndex />
        <section className="container-dmvt section-pad text-center">
          <p className="label-caps text-red">Not found</p>
          <h1 className="mt-3 font-display text-3xl text-navy">Event unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            This event may have been removed or is no longer published.
          </p>
          <Link to="/events" className="label-caps mt-6 inline-block text-red underline">
            ← Back to all events
          </Link>
        </section>
      </SiteLayout>
    );
  }

  const fakeOcc: OccurrenceWithEvent = {
    id: upcoming[0]?.id ?? "next",
    event_id: event.id,
    start_at: upcoming[0]?.start_at ?? new Date().toISOString(),
    end_at: upcoming[0]?.end_at ?? new Date().toISOString(),
    all_day: upcoming[0]?.all_day ?? event.all_day,
    event: { ...event } as OccurrenceWithEvent["event"],
  };

  return (
    <SiteLayout>
      <section className="bg-navy text-cream">
        <div className="container-dmvt py-10 md:py-14">
          <Link
            to="/events"
            className="label-caps inline-flex items-center gap-1 text-cream/70 hover:text-cream"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All events
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "label-caps inline-block border px-2 py-0.5",
                typeBadgeClass(event.type)
              )}
            >
              {EVENT_TYPE_LABEL[event.type]}
            </span>
            <span
              className={`label-caps inline-block px-2 py-0.5 text-cream ${typeSolidBgClass(event.type)}`}
            >
              {formatCost(event as unknown as OccurrenceWithEvent["event"])}
            </span>
            {event.skill_level && (
              <span className="label-caps border border-cream/30 px-2 py-0.5 text-cream/80">
                {event.skill_level}
              </span>
            )}
          </div>
          <h1 className="mt-4 font-display text-4xl text-cream md:text-5xl">
            {event.title}
          </h1>
          <div className="mt-4 grid gap-2 text-sm text-cream/80 md:grid-cols-2">
            {upcoming[0] && (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> {formatOccurrenceWhen(fakeOcc)}
              </span>
            )}
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.venue_name} · {event.city ?? ""}
              {event.region ? `, ${event.region}` : ""}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> {event.organizer_name}
            </span>
          </div>
        </div>
      </section>

      <section className="container-dmvt py-10">
        <div className="grid gap-10 md:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {event.image_url && (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full border border-hairline object-cover"
              />
            )}

            <div>
              <h2 className="label-caps mb-3 text-red">About</h2>
              <p className="whitespace-pre-line text-navy">{event.description}</p>
            </div>

            {upcoming.length > 1 && (
              <div>
                <h2 className="label-caps mb-3 text-red">Upcoming dates</h2>
                <ul className="divide-y divide-hairline border border-hairline">
                  {(showAllDates ? upcoming : upcoming.slice(0, 6)).map((o) => (
                    <li key={o.id} className="px-4 py-2 text-sm text-navy">
                      {formatOccurrenceWhen({ ...fakeOcc, ...o })}
                    </li>
                  ))}
                </ul>
                {upcoming.length > 6 && (
                  <button
                    onClick={() => setShowAllDates((v) => !v)}
                    className="label-caps mt-2 text-red underline"
                  >
                    {showAllDates ? "Show fewer" : `Show all ${upcoming.length}`}
                  </button>
                )}
              </div>
            )}

            <div>
              <h2 className="label-caps mb-3 text-red">Location</h2>
              <p className="text-navy">
                <strong>{event.venue_name}</strong>
                <br />
                {event.address}
              </p>
              {event.latitude != null && event.longitude != null && (
                <div className="mt-4 h-[280px] border border-hairline">
                  <MapContainer
                    center={[event.latitude, event.longitude]}
                    zoom={14}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[event.latitude, event.longitude]} />
                  </MapContainer>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3">
            <div className="border border-hairline bg-cream-mid p-5">
              <h3 className="label-caps mb-3 text-navy">Take action</h3>
              <div className="space-y-2">
                <Button onClick={downloadIcs} className="w-full justify-start gap-2">
                  <CalendarPlus className="h-4 w-4" /> Add to calendar (.ics)
                </Button>
                <Button onClick={share} variant="outline" className="w-full justify-start gap-2">
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                {event.info_url && (
                  <Button asChild variant="outline" className="w-full justify-start gap-2">
                    <a href={event.info_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> More info
                    </a>
                  </Button>
                )}
                {event.public_contact && (
                  <a
                    href={
                      event.public_contact.includes("@")
                        ? `mailto:${event.public_contact}`
                        : event.public_contact
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm text-navy underline"
                  >
                    Contact organizer →
                  </a>
                )}
              </div>
            </div>

            <Link
              to={`/report/${event.id}`}
              className="label-caps flex items-center gap-1.5 px-2 text-muted-foreground hover:text-red"
            >
              <Flag className="h-3.5 w-3.5" /> Report this event
            </Link>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
};

export default EventDetailPage;
