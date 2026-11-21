import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A business that offers appointments. Owned by a Clerk user (owner_id).
 */
export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    slotStepMinutes: integer("slot_step_minutes").notNull().default(30),
    bookingAdvanceDays: integer("booking_advance_days").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("businesses_slug_idx").on(t.slug),
    index("businesses_owner_idx").on(t.ownerId),
  ],
);

/**
 * A bookable service (e.g. "Haircut", 30 min).
 */
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents"),
    active: boolean("active").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("services_business_idx").on(t.businessId)],
);

/**
 * Recurring weekly availability. One row per open weekday.
 * dayOfWeek: 0 (Sunday) .. 6 (Saturday), matching JS Date#getDay().
 * Times are "HH:mm" 24h strings in the business timezone.
 * A weekday without a row means "closed that day".
 */
export const weeklyHours = pgTable(
  "weekly_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: text("open_time").notNull(),
    closeTime: text("close_time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("weekly_hours_biz_day_idx").on(t.businessId, t.dayOfWeek)],
);

/**
 * Per-date exceptions to the weekly schedule.
 * kind = "blocked"  -> closed for the whole day (holiday, vacation)
 * kind = "hours"    -> custom hours that replace the weekly hours for that date
 */
export const dateOverrides = pgTable(
  "date_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    kind: text("kind").notNull(), // "blocked" | "hours"
    openTime: text("open_time"),
    closeTime: text("close_time"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("date_overrides_biz_date_idx").on(t.businessId, t.date)],
);

/**
 * A booking made by a (possibly anonymous) client.
 * A partial unique index prevents two confirmed bookings starting
 * at the exact same moment for a business.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    clientPhone: text("client_phone"),
    status: text("status").notNull().default("confirmed"), // "confirmed" | "cancelled"
    cancelToken: uuid("cancel_token").notNull().defaultRandom(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("bookings_cancel_token_idx").on(t.cancelToken),
    uniqueIndex("bookings_biz_start_idx")
      .on(t.businessId, t.startTime)
      .where(sql`status = 'confirmed'`),
    index("bookings_biz_time_idx").on(t.businessId, t.startTime),
  ],
);

/**
 * A manually blocked time range (e.g. "already booked offline", lunch break).
 * The owner toggles these on the calendar.
 */
export const blockedSlots = pgTable(
  "blocked_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("blocked_slots_biz_time_idx").on(t.businessId, t.startTime)],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type WeeklyHour = typeof weeklyHours.$inferSelect;
export type DateOverride = typeof dateOverrides.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BlockedSlot = typeof blockedSlots.$inferSelect;

export const bookingStatuses = ["confirmed", "cancelled"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];
export const overrideKinds = ["blocked", "hours"] as const;
export type OverrideKind = (typeof overrideKinds)[number];
