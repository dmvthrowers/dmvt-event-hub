import { describe, expect, it, vi } from "vitest";

// events.ts imports the generated Supabase client, which needs env vars. The helpers
// under test never touch it.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  DEFAULT_FILTERS,
  EVENT_TYPE_LABEL,
  applyFilters,
  formatCost,
  formatLocation,
  typeColor,
  type OccurrenceWithEvent,
} from "@/lib/events";

function occ(over: Partial<OccurrenceWithEvent["event"]> = {}, when: Partial<OccurrenceWithEvent> = {}): OccurrenceWithEvent {
  return {
    id: "o1",
    event_id: "e1",
    start_at: "2026-10-18T17:00:00.000Z",
    end_at: "2026-10-18T20:00:00.000Z",
    all_day: false,
    ...when,
    event: {
      id: "e1",
      slug: "dmv-throwers-monthly-meetup",
      title: "DMV Throwers Monthly Meetup",
      type: "meetup",
      description: "Free monthly yo-yo and skill toy meetup.",
      venue_name: "Arlington Central Library",
      address: "1015 N Quincy St",
      city: "Arlington",
      region: "VA",
      country: "US",
      latitude: 38.8816,
      longitude: -77.1083,
      is_free: true,
      cost_amount: null,
      cost_currency: "USD",
      organizer_name: "DMV Throwers",
      skill_level: "all",
      age_label: "All ages",
      image_url: null,
      info_url: "https://dmvthrowers.club/events.html",
      public_contact: null,
      all_day: false,
      start_time: "13:00:00",
      end_time: "16:00:00",
      ...over,
    },
  };
}

const workshop = occ({ id: "e2", type: "workshop", title: "Intro Yo-Yo Workshop", venue_name: "Rust Library", city: "Leesburg", is_free: false, cost_amount: 10 });
const contest = occ({ id: "e3", type: "contest", title: "Virginia State Yo-Yo Contest", venue_name: "Dulles Town Center", city: "Sterling" }, {
  start_at: "2027-09-18T14:00:00.000Z",
  end_at: "2027-09-18T23:00:00.000Z",
});
const rows = [occ(), workshop, contest];

describe("applyFilters", () => {
  it("default filters keep every type", () => {
    expect(applyFilters(rows, DEFAULT_FILTERS)).toHaveLength(3);
  });
  it("filters by type", () => {
    const f = { ...DEFAULT_FILTERS, types: new Set(["workshop"] as const) };
    expect(applyFilters(rows, f).map((r) => r.event.type)).toEqual(["workshop"]);
  });
  it("free-only drops paid events", () => {
    expect(applyFilters(rows, { ...DEFAULT_FILTERS, freeOnly: true }).map((r) => r.event.id)).toEqual(["e1", "e3"]);
  });
  it("search matches title, venue and city case-insensitively", () => {
    expect(applyFilters(rows, { ...DEFAULT_FILTERS, search: "  STERLING " }).map((r) => r.event.id)).toEqual(["e3"]);
    expect(applyFilters(rows, { ...DEFAULT_FILTERS, search: "quincy" })).toHaveLength(0); // address is not searched
    expect(applyFilters(rows, { ...DEFAULT_FILTERS, search: "library" })).toHaveLength(2); // Arlington Central + Rust
  });
  it("date window keeps events that overlap it", () => {
    const f = { ...DEFAULT_FILTERS, from: new Date("2027-01-01"), to: new Date("2027-12-31") };
    expect(applyFilters(rows, f).map((r) => r.event.id)).toEqual(["e3"]);
  });
});

describe("formatting helpers", () => {
  it("formatCost", () => {
    expect(formatCost(occ().event)).toBe("Free");
    expect(formatCost(workshop.event)).toMatch(/10/);
    expect(formatCost(occ({ is_free: false, cost_amount: null }).event)).toBe("—");
    expect(formatCost(occ({ is_free: false, cost_amount: 5, cost_currency: "NOT-A-CODE" }).event)).toBe("5 NOT-A-CODE");
  });
  it("formatLocation joins venue and city/region", () => {
    expect(formatLocation(occ().event)).toBe("Arlington Central Library · Arlington, VA");
    expect(formatLocation(occ({ city: null, region: null }).event)).toBe("Arlington Central Library");
  });
});

describe("brand colors", () => {
  it("map markers use the canonical DMV Throwers palette", () => {
    expect(typeColor("meetup")).toBe("#B80000");
    expect(typeColor("workshop")).toBe("#102040");
    expect(typeColor("contest")).toBe("#7a0000");
  });
  it("every type has a label", () => {
    expect(Object.keys(EVENT_TYPE_LABEL).sort()).toEqual(["contest", "meetup", "workshop"]);
  });
});
