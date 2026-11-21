import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { jsonError, readJson } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";
import { createServiceSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/services">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const list = await db
    .select()
    .from(services)
    .where(eq(services.businessId, business.id))
    .orderBy(asc(services.position), asc(services.name));

  return Response.json({ services: list });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/services">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const body = await readJson(req);
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid service");
  }
  const data = parsed.data;

  // Position = after the last existing service.
  const [last] = await db
    .select({ position: services.position })
    .from(services)
    .where(eq(services.businessId, business.id))
    .orderBy(sql`${services.position} desc`)
    .limit(1);
  const position = (last?.position ?? 0) + 1;

  const [service] = await db
    .insert(services)
    .values({
      businessId: business.id,
      name: data.name,
      description: data.description ?? null,
      durationMinutes: data.durationMinutes,
      priceCents: data.priceCents ?? null,
      active: data.active ?? true,
      position,
    })
    .returning();

  return Response.json({ service }, { status: 201 });
}
