import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { jsonError, pgErrorCode, readJson } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";
import { updateServiceSchema } from "@/lib/validators";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/services/[serviceId]">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id, serviceId } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const existing = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.businessId, business.id)),
  });
  if (!existing) return jsonError(404, "Service not found");

  const body = await readJson(req);
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid update");
  }
  if (Object.keys(parsed.data).length === 0) {
    return jsonError(400, "Nothing to update");
  }

  const [updated] = await db
    .update(services)
    .set(parsed.data)
    .where(eq(services.id, existing.id))
    .returning();

  return Response.json({ service: updated });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/services/[serviceId]">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id, serviceId } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const existing = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.businessId, business.id)),
  });
  if (!existing) return jsonError(404, "Service not found");

  try {
    await db.delete(services).where(eq(services.id, existing.id));
    return Response.json({ ok: true });
  } catch (err) {
    // FK violation: bookings reference this service.
    if (pgErrorCode(err) === "23503") {
      return jsonError(
        409,
        "This service has bookings and cannot be deleted. Deactivate it instead.",
      );
    }
    console.error("[service delete error]", err);
    return jsonError(500, "Could not delete service");
  }
}
