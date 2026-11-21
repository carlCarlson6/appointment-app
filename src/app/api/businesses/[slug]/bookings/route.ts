import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, bookings, services } from "@/db/schema";
import { getSlotEngineInput } from "@/lib/availability";
import {
  sendBookingConfirmationClient,
  sendBookingNotificationOwner,
} from "@/lib/emails";
import { jsonError, pgErrorCode, readJson } from "@/lib/http";
import { isSlotBookable } from "@/lib/slots";
import { createBookingSchema } from "@/lib/validators";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/businesses/[slug]/bookings">,
) {
  const { slug } = await ctx.params;

  const body = await readJson(req);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid booking");
  }
  const { serviceId, startTime, clientName, clientEmail, clientPhone } =
    parsed.data;

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.slug, slug),
  });
  if (!business) return jsonError(404, "Business not found");

  const service = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.businessId, business.id)),
  });
  if (!service || !service.active) {
    return jsonError(404, "Service not found");
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);

  // Re-validate against the live schedule, occupancy and advance window.
  const dayStart = new Date(start);
  const dayEnd = new Date(start);
  dayStart.setUTCHours(0, 0, 0, 0);
  dayEnd.setUTCHours(0, 0, 0, 0);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const input = await getSlotEngineInput(
    business,
    service.durationMinutes,
    dayStart,
    dayEnd,
  );
  if (!isSlotBookable(start, input)) {
    return jsonError(409, "That time is no longer available");
  }

  try {
    const [booking] = await db
      .insert(bookings)
      .values({
        businessId: business.id,
        serviceId: service.id,
        startTime: start,
        endTime: end,
        clientName,
        clientEmail,
        clientPhone: clientPhone ?? null,
        status: "confirmed",
      })
      .returning();
    if (!booking) throw new Error("Failed to create booking");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const confirmationUrl = `${appUrl}/b/${business.slug}/booked/${booking.cancelToken}`;
    const cancelUrl = confirmationUrl;

    await sendBookingConfirmationClient({
      to: clientEmail,
      clientName,
      businessName: business.name,
      serviceName: service.name,
      start: booking.startTime.toISOString(),
      timezone: business.timezone,
      confirmationUrl,
      cancelUrl,
    });

    try {
      const client = await clerkClient();
      const owner = await client.users.getUser(business.ownerId);
      const ownerEmail = owner.emailAddresses.find(
        (e) => e.id === owner.primaryEmailAddressId,
      )?.emailAddress;
      if (ownerEmail) {
        await sendBookingNotificationOwner({
          to: ownerEmail,
          businessName: business.name,
          serviceName: service.name,
          start: booking.startTime.toISOString(),
          timezone: business.timezone,
          clientName,
          clientEmail,
          clientPhone,
        });
      }
    } catch (err) {
      console.error("[owner notification skipped]", err);
    }

    return Response.json(
      {
        booking: {
          id: booking.id,
          start: booking.startTime.toISOString(),
          end: booking.endTime.toISOString(),
          status: booking.status,
        },
        confirmationUrl,
      },
      { status: 201 },
    );
  } catch (err) {
    // Unique violation: someone else grabbed the exact same start time.
    if (pgErrorCode(err) === "23505") {
      return jsonError(409, "That time was just booked by someone else");
    }
    console.error("[booking create error]", err);
    return jsonError(500, "Could not create booking");
  }
}
