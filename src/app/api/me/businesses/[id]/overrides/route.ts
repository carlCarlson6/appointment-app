import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dateOverrides } from "@/db/schema";
import { jsonError, pgErrorCode, readJson } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";
import { createOverrideSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/overrides">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const list = await db
    .select()
    .from(dateOverrides)
    .where(eq(dateOverrides.businessId, business.id));

  return Response.json({ overrides: list });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/overrides">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const body = await readJson(req);
  const parsed = createOverrideSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid override");
  }
  const data = parsed.data;

  try {
    const [override] = await db
      .insert(dateOverrides)
      .values({
        businessId: business.id,
        date: data.date,
        kind: data.kind,
        openTime: data.openTime ?? null,
        closeTime: data.closeTime ?? null,
      })
      .returning();

    return Response.json({ override }, { status: 201 });
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      return jsonError(409, "An override for that date already exists");
    }
    console.error("[override create error]", err);
    return jsonError(500, "Could not create override");
  }
}


