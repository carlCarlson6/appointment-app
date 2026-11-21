import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, businesses, services } from "@/db/schema";
import {
  sendCancellationClient,
  sendCancellationOwner,
} from "@/lib/emails";
import { jsonError } from "@/lib/http";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/bookings/[token]/cancel">,
) {
  const { token } = await ctx.params;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.cancelToken, token),
  });
  if (!booking) return jsonError(404, "Booking not found");

  if (booking.status !== "confirmed") {
    return jsonError(409, "Booking is already cancelled");
  }
  if (booking.startTime.getTime() <= Date.now()) {
    return jsonError(409, "This booking is in the past and cannot be cancelled");
  }

  const now = new Date();
  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: now })
    .where(eq(bookings.id, booking.id))
    .returning();

  const [business, service] = await Promise.all([
    db.query.businesses.findFirst({ where: eq(businesses.id, booking.businessId) }),
    db.query.services.findFirst({ where: eq(services.id, booking.serviceId) }),
  ]);

  if (business && service) {
    await sendCancellationClient({
      to: booking.clientEmail,
      clientName: booking.clientName,
      businessName: business.name,
      serviceName: service.name,
      start: booking.startTime.toISOString(),
      timezone: business.timezone,
    });

    try {
      const client = await clerkClient();
      const owner = await client.users.getUser(business.ownerId);
      const ownerEmail = owner.emailAddresses.find(
        (e) => e.id === owner.primaryEmailAddressId,
      )?.emailAddress;
      if (ownerEmail) {
        await sendCancellationOwner({
          to: ownerEmail,
          businessName: business.name,
          serviceName: service.name,
          start: booking.startTime.toISOString(),
          timezone: business.timezone,
          clientName: booking.clientName,
        });
      }
    } catch (err) {
      console.error("[owner notification skipped]", err);
    }
  }

  return Response.json({
    booking: {
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelledAt?.toISOString(),
    },
  });
}
