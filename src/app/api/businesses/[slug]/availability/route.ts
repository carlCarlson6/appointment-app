import { addDays } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, services } from "@/db/schema";
import { computeAvailableSlots } from "@/lib/availability";
import { jsonError } from "@/lib/http";
import { groupSlotsByDate } from "@/lib/slots";
import { availabilityQuerySchema } from "@/lib/validators";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/businesses/[slug]/availability">,
) {
  const { slug } = await ctx.params;

  const url = new URL(req.url);
  const parsed = availabilityQuerySchema.safeParse({
    serviceId: url.searchParams.get("serviceId"),
    days: url.searchParams.get("days"),
  });
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid query");
  }
  const { serviceId, days } = parsed.data;

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.slug, slug),
  });
  if (!business) return jsonError(404, "Business not found");

  const service = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.businessId, business.id)),
  });
  if (!service) return jsonError(404, "Service not found");

  const fromUtc = new Date();
  const toUtc = addDays(
    fromUtc,
    Math.min(days, business.bookingAdvanceDays),
  );

  const slots = await computeAvailableSlots(business, service, fromUtc, toUtc);

  return Response.json({
    timezone: business.timezone,
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    },
    from: fromUtc.toISOString(),
    to: toUtc.toISOString(),
    dates: groupSlotsByDate(slots, business.timezone),
  });
}
