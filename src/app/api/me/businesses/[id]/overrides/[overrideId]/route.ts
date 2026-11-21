import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dateOverrides } from "@/db/schema";
import { jsonError } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/overrides/[overrideId]">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id, overrideId } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const existing = await db.query.dateOverrides.findFirst({
    where: and(
      eq(dateOverrides.id, overrideId),
      eq(dateOverrides.businessId, business.id),
    ),
  });
  if (!existing) return jsonError(404, "Override not found");

  await db.delete(dateOverrides).where(eq(dateOverrides.id, existing.id));
  return Response.json({ ok: true });
}
