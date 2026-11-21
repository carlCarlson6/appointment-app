import { TZDate } from "@date-fns/tz";
import { format, getDaysInMonth } from "date-fns";

/** First day of the week for the month grid. 1 = Monday. */
export const WEEK_STARTS_ON = 1; // Monday

export type MonthCell = { date: string; day: number; inMonth: boolean };

/** "yyyy-MM-dd" in the given IANA timezone. */
export function dateKeyInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "yyyy-MM-dd" -> "yyyy-MM". */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Business-local "yyyy-MM" of the given instant. */
export function currentMonthKey(tz: string, now: Date): string {
  return monthKeyOf(dateKeyInTz(now, tz));
}

/**
 * Shift a "yyyy-MM" key by `delta` months (negative = back).
 *
 * Month arithmetic on a day-1 anchor is timezone-independent (midnight on the
 * 1st of a month exists in every IANA zone), so a fixed "UTC" zone keeps this
 * deterministic on both server and client.
 */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new TZDate(y, m - 1, 1, "UTC");
  d.setMonth(m - 1 + delta);
  return format(d, "yyyy-MM");
}

/** "yyyy-MM" -> "November 2026" in the given timezone. */
export function monthLabel(tz: string, monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return format(new TZDate(y, m - 1, 1, tz), "MMMM yyyy");
}

/**
 * Build a Monday-first month grid for the given business-local month.
 *
 * Cells are `leading` adjacent previous-month days (grayed), then the full
 * month, then trailing adjacent days so the total length is a multiple of 7
 * (28-42 cells). Every cell carries a real "yyyy-MM-dd" date key and day
 * number; only current-month cells have `inMonth: true`.
 */
export function buildMonthGrid(tz: string, monthKey: string): MonthCell[] {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new TZDate(y, m - 1, 1, tz);
  const daysInMonth = getDaysInMonth(first);
  // getDay() is Sunday-based (0 = Sunday); (getDay() + 6) % 7 maps Monday to
  // column 0 and Sunday to the last column (6).
  const leading = (first.getDay() + 6) % 7;
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < total; i++) {
    const dayOfMonth = 1 - leading + i;
    const d = new TZDate(y, m - 1, dayOfMonth, tz); // Date rollover handles out-of-month days
    cells.push({
      date: format(d, "yyyy-MM-dd"),
      day: d.getDate(),
      inMonth: dayOfMonth >= 1 && dayOfMonth <= daysInMonth,
    });
  }
  return cells;
}

/**
 * True when there are earlier months to browse: months at or behind the month
 * containing business-local today contain nothing bookable.
 */
export function canGoPrev(monthKey: string, todayMonthKey: string): boolean {
  return monthKey > todayMonthKey; // lexicographic "yyyy-MM" compare
}

/**
 * True when the next month can be browsed: false once the next month starts
 * entirely beyond the last bookable window date.
 */
export function canGoNext(monthKey: string, windowEndDateKey: string): boolean {
  return `${shiftMonthKey(monthKey, 1)}-01` <= windowEndDateKey;
}
