// Occurrence generation shared by verify-event, manage-event and daily-maintenance.
//
// Pure TypeScript with no imports so it runs unchanged in Deno (edge functions)
// and in Vitest (src/test/occurrences.test.ts).
//
// Two rules matter:
// 1. "Monthly" means the same weekday slot each month (3rd Sunday stays 3rd Sunday),
//    which is what the DB enum `monthly_by_weekday` promises. A start on the 5th
//    weekday of a month repeats on the LAST such weekday, since most months have no 5th.
// 2. start_time / end_time are wall-clock times where the event happens. The hub is
//    DC/MD/VA only, so they are read as America/New_York and converted to UTC with the
//    correct daylight-saving offset for each date.

export type Recurrence = "none" | "weekly" | "biweekly" | "monthly_by_weekday";

export const EVENT_TZ = "America/New_York";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_OCCURRENCES = 400;

export interface OccurrenceSource {
  id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM or HH:MM:SS
  end_time: string | null;
  all_day: boolean;
  recurrence: string; // tolerates legacy "monthly"
  recurrence_until: string | null; // YYYY-MM-DD
}

export interface OccurrenceRow {
  event_id: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
}

/** Map form/legacy values onto the DB enum. Unknown values become "none". */
export function normalizeRecurrence(v: string | null | undefined): Recurrence {
  if (v === "monthly" || v === "monthly_by_weekday") return "monthly_by_weekday";
  if (v === "weekly" || v === "biweekly") return v;
  return "none";
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** The nth (1-5) given weekday (0=Sun) of a month, or null when that month has no nth. */
export function nthWeekdayOfMonth(year: number, month0: number, weekday: number, n: number): Date | null {
  const firstDow = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
  return day > daysInMonth(year, month0) ? null : new Date(Date.UTC(year, month0, day));
}

/** The last given weekday of a month. */
export function lastWeekdayOfMonth(year: number, month0: number, weekday: number): Date {
  const last = daysInMonth(year, month0);
  const lastDow = new Date(Date.UTC(year, month0, last)).getUTCDay();
  return new Date(Date.UTC(year, month0, last - ((lastDow - weekday + 7) % 7)));
}

/** Which weekday slot a date sits in: e.g. Oct 18 2026 -> { weekday: 0, n: 3 } (3rd Sunday). */
export function weekdaySlot(d: Date): { weekday: number; n: number } {
  return { weekday: d.getUTCDay(), n: Math.ceil(d.getUTCDate() / 7) };
}

/** Same weekday slot as `anchor`, `monthsAhead` months after it. */
export function monthlyByWeekday(anchor: Date, monthsAhead: number): Date {
  const { weekday, n } = weekdaySlot(anchor);
  const total = anchor.getUTCMonth() + monthsAhead;
  const year = anchor.getUTCFullYear() + Math.floor(total / 12);
  const month0 = ((total % 12) + 12) % 12;
  if (n >= 5) return lastWeekdayOfMonth(year, month0, weekday);
  return nthWeekdayOfMonth(year, month0, weekday, n) ?? lastWeekdayOfMonth(year, month0, weekday);
}

/** Offset (ms) of a time zone from UTC at a given instant, via Intl (works in Deno and Node). */
function tzOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

/** Wall-clock date + time in `tz` -> the UTC instant. "13:00" on 2026-10-18 in New York -> 17:00Z. */
export function zonedToUtc(dateYmd: string, hhmm: string, tz: string = EVENT_TZ): Date {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const [h, mi, s = 0] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  let result = guess - tzOffsetMs(new Date(guess), tz);
  // Re-check at the computed instant in case the guess straddled a DST change.
  const second = guess - tzOffsetMs(new Date(result), tz);
  if (second !== result) result = second;
  return new Date(result);
}

/** Start dates (UTC midnight, date-only) for every occurrence from start_date to recurrence_until. */
export function occurrenceDates(ev: OccurrenceSource): Date[] {
  const start = parseYmd(ev.start_date);
  const kind = normalizeRecurrence(ev.recurrence);
  if (kind === "none" || !ev.recurrence_until) return [start];

  const until = parseYmd(ev.recurrence_until);
  const out: Date[] = [];
  for (let i = 0; out.length < MAX_OCCURRENCES; i++) {
    const d =
      kind === "monthly_by_weekday"
        ? monthlyByWeekday(start, i)
        : new Date(start.getTime() + i * (kind === "weekly" ? 7 : 14) * DAY_MS);
    if (d > until) break;
    out.push(d);
  }
  return out;
}

/**
 * Rows for event_occurrences. Pass `from` to keep only occurrences that have not ended yet
 * (daily-maintenance uses this); the cadence is always anchored on start_date.
 */
export function buildOccurrences(
  ev: OccurrenceSource,
  opts: { from?: Date; tz?: string } = {},
): OccurrenceRow[] {
  const tz = opts.tz ?? EVENT_TZ;
  const spanDays = Math.round((parseYmd(ev.end_date).getTime() - parseYmd(ev.start_date).getTime()) / DAY_MS);

  const rows = occurrenceDates(ev).map((d) => {
    const startDay = ymd(d);
    const endDay = ymd(new Date(d.getTime() + spanDays * DAY_MS));
    const startAt = ev.all_day || !ev.start_time ? zonedToUtc(startDay, "00:00", tz) : zonedToUtc(startDay, ev.start_time, tz);
    const endAt = ev.all_day || !ev.end_time ? zonedToUtc(endDay, "23:59:59", tz) : zonedToUtc(endDay, ev.end_time, tz);
    return {
      event_id: ev.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: ev.all_day,
    };
  });

  return opts.from ? rows.filter((r) => new Date(r.end_at) >= opts.from!) : rows;
}
