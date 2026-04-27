import { Link } from "react-router-dom";
import { MapPin, Clock, Tag, Users } from "lucide-react";
import {
  type OccurrenceWithEvent,
  EVENT_TYPE_LABEL,
  formatCost,
  formatLocation,
  formatOccurrenceWhen,
  monthKey,
  typeBadgeClass,
} from "@/lib/events";
import { cn } from "@/lib/utils";

interface Props {
  rows: OccurrenceWithEvent[];
}

export const EventListView = ({ rows }: Props) => {
  if (rows.length === 0) {
    return (
      <div className="border border-hairline bg-cream p-10 text-center">
        <p className="label-caps text-red">No events</p>
        <p className="mt-2 text-muted-foreground">
          Try widening your filters, or be the first to{" "}
          <Link to="/submit" className="text-navy underline">submit one</Link>.
        </p>
      </div>
    );
  }

  // Group by month
  const groups = new Map<string, OccurrenceWithEvent[]>();
  for (const r of rows) {
    const key = monthKey(new Date(r.start_at));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([month, items]) => (
        <section key={month}>
          <h2 className="label-caps mb-4 border-b border-hairline pb-2 text-navy">
            {month}
          </h2>
          <ul className="space-y-3">
            {items.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/events/${o.event.slug}`}
                  className="group block border border-hairline bg-card p-5 transition-colors hover:border-navy"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "label-caps inline-block border px-2 py-0.5",
                            typeBadgeClass(o.event.type)
                          )}
                        >
                          {EVENT_TYPE_LABEL[o.event.type]}
                        </span>
                        <span className="label-caps text-red">{formatCost(o.event)}</span>
                      </div>
                      <h3 className="mt-2 font-display text-2xl text-navy group-hover:underline">
                        {o.event.title}
                      </h3>
                      <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatOccurrenceWhen(o)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {formatLocation(o.event)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {o.event.organizer_name}
                        </span>
                        {o.event.age_label && (
                          <span className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            {o.event.age_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
