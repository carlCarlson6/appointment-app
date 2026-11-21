import { and, asc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { blockedSlots } from "@/db/schema";
import { jsonError, readJson } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";
import { createBlockSchema, listBlocksQuerySchema } from "@/lib/validators";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/blocks">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const url = new URL(req.url);
  const parsed = listBlocksQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) return jsonError(400, "Invalid query");

  const conditions = [eq(blockedSlots.businessId, business.id)];
  if (parsed.data.from) conditions.push(gt(blockedSlots.endTime, new Date(parsed.data.from)));
  if (parsed.data.to) conditions.push(lt(blockedSlots.startTime, new Date(parsed.data.to)));

  const list = await db
    .select()
    .from(blockedSlots)
    .where(and(...conditions))
    .orderBy(asc(blockedSlots.startTime));

  return Response.json({ blocks: list });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/blocks">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const body = await readJson(req);
  const parsed = createBlockSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid block");
  }
  const { startTime, endTime } = parsed.data;

  const [block] = await db
    .insert(blockedSlots)
    .values({
      businessId: business.id,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    })
    .returning();

  return Response.json({ block }, { status: 201 });
}
