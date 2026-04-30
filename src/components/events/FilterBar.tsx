import { useEffect, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  type EventFilters,
  type EventType,
  EVENT_TYPE_LABEL,
} from "@/lib/events";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
  resultCount: number;
}

const ALL_TYPES: EventType[] = ["workshop", "meetup", "contest"];

export const FilterBar = ({ filters, onChange, resultCount }: FilterBarProps) => {
  // Default open on desktop, collapsed on mobile (<768px). Mirrors yoyomap MapClient.
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setOpen(false);
  }, []);

  // Count "active" filters that aren't visible when collapsed (search stays visible).
  // Types are "active" only when narrower than all-3; free-only is active when on.
  const activeCount =
    (filters.types.size < ALL_TYPES.length ? 1 : 0) + (filters.freeOnly ? 1 : 0);

  const toggleType = (t: EventType) => {
    const next = new Set(filters.types);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    if (next.size === 0) ALL_TYPES.forEach((x) => next.add(x));
    onChange({ ...filters, types: next });
  };

  return (
    <div className="border border-hairline bg-cream-mid p-4 md:p-5">
      {/* Row 1 — search (always visible) + filter disclosure button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search events, venues, cities…"
            aria-label="Search events"
            className="pl-9 pr-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="filter-bar-advanced"
          className={cn(
            "label-caps border-2 border-hairline bg-cream text-navy hover:bg-cream-mid",
            "shrink-0 gap-2"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[10px] font-bold text-cream"
              aria-label={`${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
            >
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* Row 2 — advanced controls (collapsible) */}
      {open && (
        <div
          id="filter-bar-advanced"
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3"
        >
          {ALL_TYPES.map((t) => {
            const active = filters.types.has(t);
            return (
              <Button
                key={t}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleType(t)}
                className={cn(
                  "label-caps border-2",
                  active
                    ? "border-navy bg-navy text-cream hover:bg-navy hover:text-cream"
                    : "border-hairline bg-cream text-navy hover:bg-cream-mid"
                )}
              >
                {EVENT_TYPE_LABEL[t]}
              </Button>
            );
          })}
          <div className="flex items-center gap-2 border-l border-hairline pl-3">
            <Switch
              id="free-only"
              checked={filters.freeOnly}
              onCheckedChange={(v) => onChange({ ...filters, freeOnly: v })}
            />
            <Label htmlFor="free-only" className="label-caps cursor-pointer text-navy">
              Free only
            </Label>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {resultCount === 0
          ? "No events match your filters"
          : `${resultCount} event${resultCount === 1 ? "" : "s"} matching your filters`}
      </p>
    </div>
  );
};
