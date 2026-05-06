import { supabase } from "@/integrations/supabase/client";

export type EventType = "workshop" | "meetup" | "contest";

export interface OccurrenceWithEvent {
  id: string;
  event_id: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  event: {
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
  };
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  workshop: "Workshop",
  meetup: "Meetup",
  contest: "Contest / Fair",
};

/** Returns Tailwind classes for a type badge */
export function typeBadgeClass(type: EventType): string {
  switch (type) {
    case "workshop":
      return "bg-navy text-cream border-navy";
    case "meetup":
      return "bg-red text-cream border-red";
    case "contest":
      return "bg-cream text-navy border-red border-2";
  }
}

/** Tailwind bg class for solid-background cost badges */
export function typeSolidBgClass(type: EventType): string {
  switch (type) {
    case "workshop": return "bg-navy";
    case "meetup": return "bg-red";
    case "contest": return "bg-red-dark";
  }
}

/** Hex color used by Leaflet markers + calendar chips */
export function typeColor(type: EventType): string {
  switch (type) {
    case "workshop":
      return "#102040";
    case "meetup":
      return "#B80000";
    case "contest":
      return "#7a0000";
  }
}

export interface EventFilters {
  types: Set<EventType>;
  freeOnly: boolean;
  search: string;
  from?: Date;
  to?: Date;
}

export const DEFAULT_FILTERS: EventFilters = {
  types: new Set<EventType>(["workshop", "meetup", "contest"]),
  freeOnly: false,
  search: "",
};

export async function fetchUpcomingOccurrences(): Promise<OccurrenceWithEvent[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("event_occurrences")
    .select(
      `id, event_id, start_at, end_at, all_day,
       event:events!inner(
         id, slug, title, type, description, venue_name, address,
         city, region, country, latitude, longitude,
         is_free, cost_amount, cost_currency, organizer_name,
         skill_level, age_label, image_url, info_url, public_contact,
         all_day, start_time, end_time, status
       )`
    )
    .gte("end_at", nowIso)
    .eq("event.status", "published")
    .order("start_at", { ascending: true })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as unknown as OccurrenceWithEvent[];
}

export function applyFilters(
  rows: OccurrenceWithEvent[],
  f: EventFilters
): OccurrenceWithEvent[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (!f.types.has(r.event.type)) return false;
    if (f.freeOnly && !r.event.is_free) return false;
    if (f.from && new Date(r.end_at) < f.from) return false;
    if (f.to && new Date(r.start_at) > f.to) return false;
    if (q) {
      const hay = `${r.event.title} ${r.event.description} ${r.event.venue_name} ${r.event.city ?? ""} ${r.event.region ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function formatOccurrenceWhen(o: OccurrenceWithEvent): string {
  const start = new Date(o.start_at);
  const end = new Date(o.end_at);
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  if (o.all_day) {
    const sameDay = start.toDateString() === end.toDateString();
    return sameDay
      ? `${start.toLocaleDateString(undefined, dateOpts)} · All day`
      : `${start.toLocaleDateString(undefined, dateOpts)} – ${end.toLocaleDateString(undefined, dateOpts)}`;
  }
  return `${start.toLocaleDateString(undefined, dateOpts)} · ${start.toLocaleTimeString(undefined, timeOpts)} – ${end.toLocaleTimeString(undefined, timeOpts)}`;
}

export function formatLocation(e: OccurrenceWithEvent["event"]): string {
  const parts = [e.venue_name, [e.city, e.region].filter(Boolean).join(", ")].filter(Boolean);
  return parts.join(" · ");
}

export function formatCost(e: OccurrenceWithEvent["event"]): string {
  if (e.is_free) return "Free";
  if (e.cost_amount == null) return "—";
  const currency = e.cost_currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(e.cost_amount));
  } catch {
    return `${e.cost_amount} ${currency}`;
  }
}

export function monthKey(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
