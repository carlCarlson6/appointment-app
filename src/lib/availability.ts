import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  blockedSlots,
  bookings,
  dateOverrides,
  weeklyHours,
  type Business,
} from "@/db/schema";
import { generateSlots, type SlotEngineInput } from "@/lib/slots";

/**
 * Build the slot engine input for a business + service duration over a
 * UTC window, reading the schedule, overrides and occupancy from the DB.
 */
export async function getSlotEngineInput(
  business: Business,
  durationMinutes: number,
  fromUtc: Date,
  toUtc: Date,
): Promise<SlotEngineInput> {
  const [hours, overrides, confirmedBookings, blocks] = await Promise.all([
    db
      .select({
        dayOfWeek: weeklyHours.dayOfWeek,
        openTime: weeklyHours.openTime,
        closeTime: weeklyHours.closeTime,
      })
      .from(weeklyHours)
      .where(eq(weeklyHours.businessId, business.id)),
    db
      .select({
        date: dateOverrides.date,
        kind: dateOverrides.kind,
        openTime: dateOverrides.openTime,
        closeTime: dateOverrides.closeTime,
      })
      .from(dateOverrides)
      .where(eq(dateOverrides.businessId, business.id)),
    db
      .select({
        startTime: bookings.startTime,
        endTime: bookings.endTime,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.businessId, business.id),
          eq(bookings.status, "confirmed"),
          lt(bookings.startTime, toUtc),
          gt(bookings.endTime, fromUtc),
        ),
      ),
    db
      .select({
        startTime: blockedSlots.startTime,
        endTime: blockedSlots.endTime,
      })
      .from(blockedSlots)
      .where(
        and(
          eq(blockedSlots.businessId, business.id),
          lt(blockedSlots.startTime, toUtc),
          gt(blockedSlots.endTime, fromUtc),
        ),
      ),
  ]);

  return {
    timezone: business.timezone,
    slotStepMinutes: business.slotStepMinutes,
    durationMinutes,
    weeklyHours: hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime,
      closeTime: h.closeTime,
    })),
    overrides: overrides.map((o) => ({
      date: o.date,
      kind: o.kind as "blocked" | "hours",
      openTime: o.openTime,
      closeTime: o.closeTime,
    })),
    occupied: [
      ...confirmedBookings.map((b) => ({ start: b.startTime, end: b.endTime })),
      ...blocks.map((b) => ({ start: b.startTime, end: b.endTime })),
    ],
    fromUtc,
    toUtc,
  };
}

/** Convenience: compute all bookable slots for a service in a UTC window. */
export async function computeAvailableSlots(
  business: Business,
  service: { durationMinutes: number },
  fromUtc: Date,
  toUtc: Date,
) {
  const input = await getSlotEngineInput(
    business,
    service.durationMinutes,
    fromUtc,
    toUtc,
  );
  return generateSlots(input);
}
