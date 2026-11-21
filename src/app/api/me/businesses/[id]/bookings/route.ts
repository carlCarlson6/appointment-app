import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, services } from "@/db/schema";
import { jsonError } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";
import { listBookingsQuerySchema } from "@/lib/validators";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/bookings">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const url = new URL(req.url);
  const parsed = listBookingsQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    status: url.searchParams.get("status"),
  });
  if (!parsed.success) return jsonError(400, "Invalid query");

  const conditions = [eq(bookings.businessId, business.id)];
  if (parsed.data.from) conditions.push(gt(bookings.endTime, new Date(parsed.data.from)));
  if (parsed.data.to) conditions.push(lt(bookings.startTime, new Date(parsed.data.to)));
  if (parsed.data.status) conditions.push(eq(bookings.status, parsed.data.status));

  const list = await db
    .select()
    .from(bookings)
    .where(and(...conditions))
    .orderBy(asc(bookings.startTime));

  // Attach service names.
  const serviceIds = [...new Set(list.map((b) => b.serviceId))];
  const serviceRows = serviceIds.length
    ? await db
        .select({ id: services.id, name: services.name })
        .from(services)
        .where(inArray(services.id, serviceIds))
    : [];
  const serviceName = new Map(serviceRows.map((s) => [s.id, s.name]));

  return Response.json({
    bookings: list.map((b) => ({
      ...b,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      cancelledAt: b.cancelledAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      serviceName: serviceName.get(b.serviceId) ?? null,
    })),
  });
}
