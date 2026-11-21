import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { jsonError } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";

/** The business owner cancels a booking on behalf of a client. */
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/bookings/[bookingId]/cancel">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id, bookingId } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, bookingId),
      eq(bookings.businessId, business.id),
    ),
  });
  if (!booking) return jsonError(404, "Booking not found");
  if (booking.status !== "confirmed") {
    return jsonError(409, "Booking is already cancelled");
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(bookings.id, booking.id))
    .returning();

  return Response.json({
    booking: {
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelledAt?.toISOString(),
    },
  });
}
