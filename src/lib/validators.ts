import { z } from "zod";

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");

export const isoDateTime = z.iso.datetime();

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and single hyphens");

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1).max(100),
  timezone: z.string().trim().min(1).max(64),
  slug: slugSchema.optional(),
  slotStepMinutes: z.number().int().min(5).max(240).optional(),
  bookingAdvanceDays: z.number().int().min(1).max(365).optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  slug: slugSchema.optional(),
  slotStepMinutes: z.number().int().min(5).max(240).optional(),
  bookingAdvanceDays: z.number().int().min(1).max(365).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z.number().int().min(5).max(1440),
  priceCents: z.number().int().min(0).max(10_000_000).nullish(),
  active: z.boolean().optional(),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullish(),
  durationMinutes: z.number().int().min(5).max(1440).optional(),
  priceCents: z.number().int().min(0).max(10_000_000).nullish(),
  active: z.boolean().optional(),
});

export const scheduleDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: timeSchema,
  closeTime: timeSchema,
});

export const updateScheduleSchema = z.object({
  days: z.array(scheduleDaySchema).max(7),
});

export const createOverrideSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    kind: z.enum(["blocked", "hours"]),
    openTime: timeSchema.nullish(),
    closeTime: timeSchema.nullish(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "hours") {
      if (!val.openTime || !val.closeTime) {
        ctx.addIssue({
          code: "custom",
          message: "openTime and closeTime are required for 'hours' overrides",
        });
        return;
      }
      const [oh, om] = val.openTime.split(":").map(Number);
      const [ch, cm] = val.closeTime.split(":").map(Number);
      if (oh * 60 + om >= ch * 60 + cm) {
        ctx.addIssue({
          code: "custom",
          message: "closeTime must be after openTime",
        });
      }
    }
  });

export const createBlockSchema = z
  .object({
    startTime: isoDateTime,
    endTime: isoDateTime,
  })
  .refine((v) => new Date(v.endTime) > new Date(v.startTime), {
    message: "endTime must be after startTime",
  });

export const createBookingSchema = z.object({
  serviceId: z.uuid(),
  startTime: isoDateTime,
  clientName: z.string().trim().min(1).max(100),
  clientEmail: z.email(),
  clientPhone: z.string().trim().max(40).optional(),
});

export const listBookingsQuerySchema = z.object({
  from: isoDateTime.nullish(),
  to: isoDateTime.nullish(),
  status: z.enum(["confirmed", "cancelled"]).nullish(),
});

export const listBlocksQuerySchema = z.object({
  from: isoDateTime.nullish(),
  to: isoDateTime.nullish(),
});

export const availabilityQuerySchema = z.object({
  serviceId: z.uuid(),
  days: z.coerce.number().int().min(1).max(60).default(14),
});
