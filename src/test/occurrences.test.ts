import { describe, expect, it } from "vitest";
import {
  buildOccurrences,
  monthlyByWeekday,
  normalizeRecurrence,
  nthWeekdayOfMonth,
  occurrenceDates,
  parseYmd,
  ymd,
  zonedToUtc,
  type OccurrenceSource,
} from "../../supabase/functions/_shared/occurrences";

const base: OccurrenceSource = {
  id: "evt-1",
  start_date: "2026-10-18",
  end_date: "2026-10-18",
  start_time: "13:00",
  end_time: "16:00",
  all_day: false,
  recurrence: "none",
  recurrence_until: null,
};

describe("normalizeRecurrence", () => {
  it("maps the legacy form value onto the DB enum", () => {
    expect(normalizeRecurrence("monthly")).toBe("monthly_by_weekday");
    expect(normalizeRecurrence("monthly_by_weekday")).toBe("monthly_by_weekday");
    expect(normalizeRecurrence("weekly")).toBe("weekly");
    expect(normalizeRecurrence("biweekly")).toBe("biweekly");
  });
  it("treats unknown and empty values as one-off events", () => {
    expect(normalizeRecurrence("daily")).toBe("none");
    expect(normalizeRecurrence(null)).toBe("none");
    expect(normalizeRecurrence(undefined)).toBe("none");
  });
});

describe("weekday-of-month math", () => {
  it("finds the third Sunday", () => {
    expect(ymd(nthWeekdayOfMonth(2026, 9, 0, 3)!)).toBe("2026-10-18");
    expect(ymd(nthWeekdayOfMonth(2026, 10, 0, 3)!)).toBe("2026-11-15");
  });
  it("returns null when a month has no 5th weekday", () => {
    expect(nthWeekdayOfMonth(2026, 1, 0, 5)).toBeNull(); // Feb 2026 has four Sundays
  });
  it("keeps the 3rd-Sunday slot across a year boundary", () => {
    const anchor = parseYmd("2026-10-18");
    expect([0, 1, 2, 3, 4, 5].map((i) => ymd(monthlyByWeekday(anchor, i)))).toEqual([
      "2026-10-18",
      "2026-11-15",
      "2026-12-20",
      "2027-01-17",
      "2027-02-21",
      "2027-03-21",
    ]);
  });
  it("repeats a 5th-weekday start on the last weekday of later months", () => {
    const anchor = parseYmd("2026-10-31"); // 5th Saturday of October
    expect(ymd(monthlyByWeekday(anchor, 1))).toBe("2026-11-28");
    expect(ymd(monthlyByWeekday(anchor, 2))).toBe("2026-12-26");
  });
});

describe("zonedToUtc (America/New_York)", () => {
  it("applies EDT before the November DST change", () => {
    expect(zonedToUtc("2026-10-18", "13:00").toISOString()).toBe("2026-10-18T17:00:00.000Z");
  });
  it("applies EST after it", () => {
    expect(zonedToUtc("2026-11-15", "13:00").toISOString()).toBe("2026-11-15T18:00:00.000Z");
  });
  it("accepts Postgres TIME strings with seconds", () => {
    expect(zonedToUtc("2027-03-21", "13:00:00").toISOString()).toBe("2027-03-21T17:00:00.000Z");
  });
});

describe("occurrenceDates", () => {
  it("one-off events produce a single date even if recurrence_until is set", () => {
    expect(occurrenceDates({ ...base, recurrence_until: "2027-01-01" }).map(ymd)).toEqual(["2026-10-18"]);
  });
  it("weekly", () => {
    const ev = { ...base, start_date: "2026-10-14", end_date: "2026-10-14", recurrence: "weekly", recurrence_until: "2026-11-04" };
    expect(occurrenceDates(ev).map(ymd)).toEqual(["2026-10-14", "2026-10-21", "2026-10-28", "2026-11-04"]);
  });
  it("biweekly", () => {
    const ev = { ...base, start_date: "2026-10-14", end_date: "2026-10-14", recurrence: "biweekly", recurrence_until: "2026-11-25" };
    expect(occurrenceDates(ev).map(ymd)).toEqual(["2026-10-14", "2026-10-28", "2026-11-11", "2026-11-25"]);
  });
  it("legacy 'monthly' rows still follow the weekday slot", () => {
    const ev = { ...base, recurrence: "monthly", recurrence_until: "2026-12-31" };
    expect(occurrenceDates(ev).map(ymd)).toEqual(["2026-10-18", "2026-11-15", "2026-12-20"]);
  });
  it("stops at recurrence_until inclusive", () => {
    const ev = { ...base, recurrence: "monthly_by_weekday", recurrence_until: "2026-11-15" };
    expect(occurrenceDates(ev).map(ymd)).toEqual(["2026-10-18", "2026-11-15"]);
  });
});

describe("buildOccurrences", () => {
  it("the Arlington meetup lands at 1-4 PM Eastern on both sides of DST", () => {
    const rows = buildOccurrences({ ...base, recurrence: "monthly_by_weekday", recurrence_until: "2026-11-30" });
    expect(rows).toEqual([
      { event_id: "evt-1", start_at: "2026-10-18T17:00:00.000Z", end_at: "2026-10-18T20:00:00.000Z", all_day: false },
      { event_id: "evt-1", start_at: "2026-11-15T18:00:00.000Z", end_at: "2026-11-15T21:00:00.000Z", all_day: false },
    ]);
  });
  it("all-day events cover the whole Eastern day, not the UTC day", () => {
    const [row] = buildOccurrences({ ...base, all_day: true, start_time: null, end_time: null });
    expect(row.start_at).toBe("2026-10-18T04:00:00.000Z");
    expect(row.end_at).toBe("2026-10-19T03:59:59.000Z");
  });
  it("multi-day events keep their span", () => {
    const [row] = buildOccurrences({
      ...base,
      start_date: "2026-09-19",
      end_date: "2026-09-20",
      start_time: "10:00",
      end_time: "19:00",
    });
    expect(row.start_at).toBe("2026-09-19T14:00:00.000Z");
    expect(row.end_at).toBe("2026-09-20T23:00:00.000Z");
  });
  it("`from` drops finished occurrences but keeps the original cadence", () => {
    const ev = {
      ...base,
      start_date: "2026-10-01",
      end_date: "2026-10-01",
      start_time: "19:00",
      end_time: "21:00",
      recurrence: "weekly",
      recurrence_until: "2026-12-31",
    };
    const rows = buildOccurrences(ev, { from: new Date("2026-11-21T00:00:00Z") });
    expect(rows[0].start_at).toBe("2026-11-27T00:00:00.000Z"); // Thu Nov 26, 7 PM EST
    expect(rows.every((r) => new Date(r.start_at).getUTCDay() === 5)).toBe(true); // Thu evening ET = Fri UTC
  });
  it("caps runaway series", () => {
    const ev = { ...base, start_date: "2026-01-01", end_date: "2026-01-01", recurrence: "weekly", recurrence_until: "2099-01-01" };
    expect(buildOccurrences(ev).length).toBeLessThanOrEqual(400);
  });
});
