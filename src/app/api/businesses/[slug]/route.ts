import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, services } from "@/db/schema";
import { jsonError } from "@/lib/http";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/businesses/[slug]">,
) {
  const { slug } = await ctx.params;

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.slug, slug),
  });

  if (!business) return jsonError(404, "Business not found");

  const activeServices = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMinutes: services.durationMinutes,
      priceCents: services.priceCents,
    })
    .from(services)
    .where(eq(services.businessId, business.id))
    .orderBy(services.position, services.name);

  return Response.json({
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
    },
    services: activeServices,
  });
}
