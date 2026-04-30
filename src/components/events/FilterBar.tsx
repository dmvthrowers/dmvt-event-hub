import { Search, X } from "lucide-react";
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
  const toggleType = (t: EventType) => {
    const next = new Set(filters.types);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    if (next.size === 0) ALL_TYPES.forEach((x) => next.add(x));
    onChange({ ...filters, types: next });
  };

  return (
    <div className="border border-hairline bg-cream-mid p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
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
        <div className="flex flex-wrap items-center gap-2">
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
      </div>
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {resultCount === 0
          ? "No events match your filters"
          : `${resultCount} event${resultCount === 1 ? "" : "s"} matching your filters`}
      </p>
    </div>
  );
};
