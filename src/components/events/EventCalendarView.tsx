import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type OccurrenceWithEvent,
  typeColor,
  EVENT_TYPE_LABEL,
} from "@/lib/events";
import { cn } from "@/lib/utils";

interface Props {
  rows: OccurrenceWithEvent[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildCalendarGrid(monthStart: Date): Date[] {
  const start = new Date(monthStart);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const EventCalendarView = ({ rows }: Props) => {
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));

  const days = useMemo(() => buildCalendarGrid(cursor), [cursor]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, OccurrenceWithEvent[]>();
    for (const r of rows) {
      const start = new Date(r.start_at);
      const end = new Date(r.end_at);
      // For multi-day events, add to every day in range
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur <= last) {
        const key = cur.toDateString();
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(r);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return m;
  }, [rows]);

  const today = new Date();
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border border-hairline bg-card">
      <div className="flex items-center justify-between border-b border-hairline p-4">
        <h2 className="font-display text-2xl text-navy">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="label-caps"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const d = new Date(cursor);
              d.setMonth(d.getMonth() - 1);
              setCursor(d);
            }}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const d = new Date(cursor);
              d.setMonth(d.getMonth() + 1);
              setCursor(d);
            }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-hairline bg-cream-mid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="label-caps p-2 text-center text-navy">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d, idx) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
          return (
            <div
              key={idx}
              className={cn(
                "min-h-[110px] border-b border-r border-hairline p-1.5",
                !inMonth && "bg-cream-mid/40 text-muted-foreground",
                idx % 7 === 0 && "border-l"
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center text-xs",
                  isToday && "bg-red font-bold text-cream"
                )}
              >
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    to={`/events/${o.event.slug}`}
                    title={`${o.event.title} — ${EVENT_TYPE_LABEL[o.event.type]}`}
                    className="block truncate border-l-2 px-1 py-0.5 text-[10.5px] leading-tight text-navy hover:bg-cream-mid"
                    style={{ borderLeftColor: typeColor(o.event.type) }}
                  >
                    {o.event.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
