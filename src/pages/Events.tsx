import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { List, Map as MapIcon, CalendarDays, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FilterBar } from "@/components/events/FilterBar";
import { EventListView } from "@/components/events/EventListView";
import { EventMapView } from "@/components/events/EventMapView";
import { EventCalendarView } from "@/components/events/EventCalendarView";
import {
  DEFAULT_FILTERS,
  applyFilters,
  fetchUpcomingOccurrences,
  type EventFilters,
} from "@/lib/events";

export const EventsPage = () => {
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"list" | "map" | "calendar">("list");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["event-occurrences"],
    queryFn: fetchUpcomingOccurrences,
    staleTime: 60_000,
  });

  const filtered = useMemo(
    () => applyFilters(data ?? [], filters),
    [data, filters]
  );

  return (
    <SiteLayout>
      <section className="bg-navy text-cream">
        <div className="container-dmvt py-12 md:py-16">
          <p className="label-caps text-red">Find your crew</p>
          <h1 className="mt-3 font-display text-4xl text-cream md:text-5xl">
            Events Explorer
          </h1>
          <p className="mt-3 max-w-2xl text-cream/80">
            Workshops, meetups, and contests submitted by the yo-yo community.
            Browse the list, drop pins on the map, or scan the month at a glance.
          </p>
        </div>
      </section>

      <section className="container-dmvt py-8 md:py-10">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          resultCount={filtered.length}
        />

        <Tabs
          value={view}
          onValueChange={(v) => setView(v as typeof view)}
          className="mt-6"
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

          <div className="mt-6">
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
          </div>
        </Tabs>
      </section>
    </SiteLayout>
  );
};

export default EventsPage;
