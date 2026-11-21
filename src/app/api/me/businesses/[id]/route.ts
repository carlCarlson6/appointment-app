import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { jsonError, pgErrorCode, readJson } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";
import { updateBusinessSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  return Response.json({ business });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const body = await readJson(req);
  const parsed = updateBusinessSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid update");
  }
  if (Object.keys(parsed.data).length === 0) {
    return jsonError(400, "Nothing to update");
  }

  try {
    const [updated] = await db
      .update(businesses)
      .set(parsed.data)
      .where(eq(businesses.id, business.id))
      .returning();
    return Response.json({ business: updated });
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      return jsonError(409, "That slug is already taken");
    }
    console.error("[business update error]", err);
    return jsonError(500, "Could not update business");
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  await db.delete(businesses).where(eq(businesses.id, business.id));

  return Response.json({ ok: true });
}
