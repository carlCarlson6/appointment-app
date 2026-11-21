import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { blockedSlots } from "@/db/schema";
import { jsonError } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/blocks/[blockId]">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id, blockId } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const existing = await db.query.blockedSlots.findFirst({
    where: and(
      eq(blockedSlots.id, blockId),
      eq(blockedSlots.businessId, business.id),
    ),
  });
  if (!existing) return jsonError(404, "Blocked slot not found");

  await db.delete(blockedSlots).where(eq(blockedSlots.id, existing.id));
  return Response.json({ ok: true });
}
