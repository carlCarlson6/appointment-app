import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, businesses, services } from "@/db/schema";
import { jsonError } from "@/lib/http";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/bookings/[token]">,
) {
  const { token } = await ctx.params;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.cancelToken, token),
  });
  if (!booking) return jsonError(404, "Booking not found");

  const [business, service] = await Promise.all([
    db.query.businesses.findFirst({ where: eq(businesses.id, booking.businessId) }),
    db.query.services.findFirst({ where: eq(services.id, booking.serviceId) }),
  ]);

  return Response.json({
    booking: {
      id: booking.id,
      start: booking.startTime.toISOString(),
      end: booking.endTime.toISOString(),
      clientName: booking.clientName,
      status: booking.status,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      createdAt: booking.createdAt.toISOString(),
    },
    business: business
      ? { name: business.name, slug: business.slug, timezone: business.timezone }
      : null,
    service: service ? { name: service.name, durationMinutes: service.durationMinutes } : null,
  });
}
