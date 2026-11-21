import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export type HoursRow = {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  openTime: string; // "HH:mm" in business timezone
  closeTime: string; // "HH:mm" in business timezone
};

export type DateOverride = {
  date: string; // "yyyy-MM-dd" in business timezone
  kind: "blocked" | "hours";
  openTime: string | null;
  closeTime: string | null;
};

export type OccupiedRange = {
  start: Date;
  end: Date;
};

export type Slot = {
  start: string; // ISO 8601 UTC
  end: string; // ISO 8601 UTC
};

export interface SlotEngineInput {
  timezone: string; // IANA timezone of the business
  slotStepMinutes: number; // grid granularity
  durationMinutes: number; // length of the service being booked
  weeklyHours: HoursRow[];
  overrides: DateOverride[];
  /** Everything that makes a slot unavailable: confirmed bookings + blocked slots */
  occupied: OccupiedRange[];
  /** Inclusive range (UTC) in which to look for slots */
  fromUtc: Date;
  toUtc: Date;
}

/** "HH:mm" -> minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    throw new Error(`Invalid time "${time}", expected "HH:mm"`);
  }
  return h * 60 + m;
}

type OpenRange = { openMinutes: number; closeMinutes: number };

/** Effective open hours for one business-local date. null = closed. */
function effectiveHours(
  businessDate: TZDate,
  weeklyHours: HoursRow[],
  overrides: DateOverride[],
): OpenRange | null {
  const dateStr = format(businessDate, "yyyy-MM-dd");
  const override = overrides.find((o) => o.date === dateStr);

  if (override) {
    if (override.kind === "blocked") return null;
    if (override.openTime && override.closeTime) {
      return {
        openMinutes: timeToMinutes(override.openTime),
        closeMinutes: timeToMinutes(override.closeTime),
      };
    }
    return null;
  }

  const row = weeklyHours.find(
    (w) => w.dayOfWeek === businessDate.getDay(),
  );
  if (!row) return null;

  return {
    openMinutes: timeToMinutes(row.openTime),
    closeMinutes: timeToMinutes(row.closeTime),
  };
}

function overlaps(a: OccupiedRange, start: Date, end: Date): boolean {
  return start < a.end && end > a.start;
}

/**
 * Compute every bookable slot in the given UTC window.
 *
 * Rules:
 * - Base schedule = weekly hours, overridden per-date by dateOverrides
 *   ("blocked" closes the day, "hours" replaces the hours).
 * - Slots start on the business's slot grid (openTime + n * step)
 *   and must fully fit inside open hours (start + duration <= close).
 * - Slots overlapping a booking or blocked slot are removed.
 * - Slots starting in the past are removed.
 */
export function generateSlots(input: SlotEngineInput): Slot[] {
  const { timezone, slotStepMinutes, durationMinutes, weeklyHours, overrides, occupied } =
    input;

  const slots: Slot[] = [];
  const now = Date.now();
  const fromMs = input.fromUtc.getTime();
  const toMs = input.toUtc.getTime();

  const cursor = new TZDate(input.fromUtc, timezone);
  const toLocal = new TZDate(input.toUtc, timezone);

  while (cursor <= toLocal) {
    const hours = effectiveHours(cursor, weeklyHours, overrides);

    if (hours && hours.closeMinutes > hours.openMinutes) {
      for (
        let startMin = hours.openMinutes;
        startMin + durationMinutes <= hours.closeMinutes;
        startMin += slotStepMinutes
      ) {
        const start = new TZDate(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
          Math.floor(startMin / 60),
          startMin % 60,
          timezone,
        );
        const startMs = start.getTime();
        const end = new Date(startMs + durationMinutes * 60_000);

        if (startMs <= now) continue;
        if (startMs < fromMs || startMs > toMs) continue;
        if (occupied.some((o) => overlaps(o, start, end))) continue;

        slots.push({
          start: new Date(startMs).toISOString(),
          end: end.toISOString(),
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  slots.sort((a, b) => a.start.localeCompare(b.start));
  return slots;
}

/**
 * True if the given UTC start is a currently bookable slot for a service
 * of `durationMinutes`. Used to re-validate a booking server-side.
 */
export function isSlotBookable(
  startUtc: Date,
  input: SlotEngineInput,
): boolean {
  const dayStart = new TZDate(startUtc, input.timezone);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new TZDate(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const slots = generateSlots({
    ...input,
    fromUtc: dayStart,
    toUtc: dayEnd,
  });
  return slots.some((s) => new Date(s.start).getTime() === startUtc.getTime());
}

/** Group slots by business-local date: "yyyy-MM-dd" -> slots */
export function groupSlotsByDate(
  slots: Slot[],
  timezone: string,
): Array<{ date: string; slots: Slot[] }> {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const date = format(new TZDate(slot.start, timezone), "yyyy-MM-dd");
    const list = map.get(date) ?? [];
    list.push(slot);
    map.set(date, list);
  }
  return [...map.entries()]
    .map(([date, list]) => ({ date, slots: list }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
