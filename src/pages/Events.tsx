import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  List,
  Map as MapIcon,
  CalendarDays,
  Loader2,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Seo } from "@/components/seo/Seo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FilterBar } from "@/components/events/FilterBar";
import { EventListView } from "@/components/events/EventListView";
import { EventMapView } from "@/components/events/EventMapView";
import { EventCalendarView } from "@/components/events/EventCalendarView";
import {
  DEFAULT_FILTERS,
  EVENT_TYPE_LABEL,
  applyFilters,
  fetchUpcomingOccurrences,
  type EventFilters,
  type EventType,
} from "@/lib/events";

type View = "list" | "map" | "calendar";
const isView = (v: string | null): v is View =>
  v === "list" || v === "map" || v === "calendar";

export const EventsPage = () => {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);

  const view: View = isView(params.get("view")) ? (params.get("view") as View) : "list";
  const setView = (v: View) => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    setParams(next, { replace: true });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["event-occurrences"],
    queryFn: fetchUpcomingOccurrences,
    staleTime: 60_000,
  });

  const filtered = useMemo(
    () => applyFilters(data ?? [], filters),
    [data, filters]
  );

  const totalCount = data?.length ?? 0;
  const filtersActive =
    filters.types.size < 3 ||
    filters.freeOnly ||
    filters.search.trim().length > 0;

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <SiteLayout>
      <Seo
        title="Browse Yo-Yo & Skill Toy Events — List, Map, Calendar"
        description="Explore upcoming yo-yo, kendama, and skill toy workshops, meetups, and contests. Filter by type, region, or city. View as a list, map, or calendar."
        path="/events"
      />
      <section className="bg-navy text-cream">
        <div className="container-dmvt py-12 md:py-16">
          <p className="label-caps text-red">Find your crew</p>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mt-3 font-display text-4xl text-cream md:text-5xl">
                Events Explorer
              </h1>
              <p className="mt-3 max-w-2xl text-cream/80">
                Workshops, meetups, and contests submitted by the yo-yo
                community. Browse the list, drop pins on the map, or scan the
                month at a glance.
              </p>
            </div>
            <Link
              to="/subscribe"
              className="label-caps inline-flex w-fit items-center gap-2 bg-red px-4 py-2.5 text-cream hover:bg-red-dark"
            >
              <CalendarIcon className="h-4 w-4" /> Subscribe to calendar
            </Link>
          </div>
        </div>
      </section>

      <section className="container-dmvt py-8 md:py-10">
        {/* Sticky filter + view controls so they stay reachable while scrolling */}
        <div className="sticky top-16 z-30 -mx-4 bg-cream/95 px-4 pb-3 pt-3 backdrop-blur supports-[backdrop-filter]:bg-cream/85 md:mx-0 md:px-0">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            resultCount={filtered.length}
          />

          {filtersActive && (
            <ActiveFilterChips
              filters={filters}
              onChange={setFilters}
              onClearAll={clearFilters}
            />
          )}

          <Tabs
            value={view}
            onValueChange={(v) => setView(v as View)}
            className="mt-4"
          >
            <TabsList className="bg-cream-mid">
              <TabsTrigger value="list" className="label-caps gap-1.5">
                <List className="h-3.5 w-3.5" /> List
              </TabsTrigger>
              <TabsTrigger value="map" className="label-caps gap-1.5">
                <MapIcon className="h-3.5 w-3.5" /> Map
              </TabsTrigger>
              <TabsTrigger value="calendar" className="label-caps gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={view} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center border border-hairline bg-cream p-16">
              <Loader2 className="h-6 w-6 animate-spin text-red" />
            </div>
          ) : isError ? (
            <div className="border border-red bg-cream p-8 text-center">
              <p className="label-caps text-red">Couldn't load events</p>
              <p className="mt-2 text-muted-foreground">
                Check your connection and try again.
              </p>
            </div>
          ) : filtered.length === 0 && totalCount > 0 ? (
            <EmptyFiltered onClear={clearFilters} />
          ) : (
            <>
              <TabsContent value="list" className="mt-0">
                <EventListView rows={filtered} />
              </TabsContent>
              <TabsContent value="map" className="mt-0">
                <EventMapView rows={filtered} />
              </TabsContent>
              <TabsContent value="calendar" className="mt-0">
                <EventCalendarView rows={filtered} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </section>
    </SiteLayout>
  );
};

const EmptyFiltered = ({ onClear }: { onClear: () => void }) => (
  <div className="border border-hairline bg-cream p-10 text-center">
    <p className="label-caps text-red">No matches</p>
    <p className="mt-2 text-muted-foreground">
      No events match your current filters. Try widening your search or clear
      filters to see everything coming up.
    </p>
    <button
      type="button"
      onClick={onClear}
      className="label-caps mt-5 inline-flex items-center gap-1.5 border-2 border-navy bg-navy px-4 py-2 text-cream hover:bg-navy/90"
    >
      <X className="h-3.5 w-3.5" /> Clear all filters
    </button>
  </div>
);

const ActiveFilterChips = ({
  filters,
  onChange,
  onClearAll,
}: {
  filters: EventFilters;
  onChange: (f: EventFilters) => void;
  onClearAll: () => void;
}) => {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.search.trim()) {
    chips.push({
      key: "search",
      label: `“${filters.search}”`,
      onRemove: () => onChange({ ...filters, search: "" }),
    });
  }
  if (filters.types.size < 3) {
    [...filters.types].forEach((t) => {
      chips.push({
        key: `type-${t}`,
        label: EVENT_TYPE_LABEL[t as EventType],
        onRemove: () => {
          const next = new Set(filters.types);
          next.delete(t);
          if (next.size === 0)
            (["workshop", "meetup", "contest"] as EventType[]).forEach((x) =>
              next.add(x)
            );
          onChange({ ...filters, types: next });
        },
      });
    });
  }
  if (filters.freeOnly) {
    chips.push({
      key: "free",
      label: "Free only",
      onRemove: () => onChange({ ...filters, freeOnly: false }),
    });
  }

  if (chips.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          className="label-caps inline-flex items-center gap-1 border border-navy bg-navy px-2 py-1 text-[11px] text-cream hover:bg-red hover:border-red"
        >
          {c.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="label-caps text-[11px] text-muted-foreground hover:text-red"
      >
        Clear all
      </button>
    </div>
  );
};

export default EventsPage;
