import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dateOverrides, weeklyHours } from "@/db/schema";
import { jsonError, readJson } from "@/lib/http";
import { getOwnedBusiness, getUserId } from "@/lib/owner";
import { updateScheduleSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/schedule">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const [hours, overrides] = await Promise.all([
    db
      .select()
      .from(weeklyHours)
      .where(eq(weeklyHours.businessId, business.id))
      .orderBy(asc(weeklyHours.dayOfWeek)),
    db
      .select()
      .from(dateOverrides)
      .where(eq(dateOverrides.businessId, business.id))
      .orderBy(asc(dateOverrides.date)),
  ]);

  return Response.json({ hours, overrides });
}

/**
 * Replace the whole weekly schedule with the given days.
 * Days with a row are open; weekdays without a row are closed.
 */
export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/me/businesses/[id]/schedule">,
) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");
  const { id } = await ctx.params;

  const business = await getOwnedBusiness(userId, id);
  if (!business) return jsonError(404, "Business not found");

  const body = await readJson(req);
  const parsed = updateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid schedule");
  }
  const { days } = parsed.data;

  const seen = new Set<number>();
  for (const day of days) {
    if (seen.has(day.dayOfWeek)) {
      return jsonError(400, "Duplicate day in schedule");
    }
    seen.add(day.dayOfWeek);
    const [oh, om] = day.openTime.split(":").map(Number);
    const [ch, cm] = day.closeTime.split(":").map(Number);
    if (oh * 60 + om >= ch * 60 + cm) {
      return jsonError(400, "closeTime must be after openTime");
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(weeklyHours).where(eq(weeklyHours.businessId, business.id));
    if (days.length > 0) {
      await tx.insert(weeklyHours).values(
        days.map((d) => ({
          businessId: business.id,
          dayOfWeek: d.dayOfWeek,
          openTime: d.openTime,
          closeTime: d.closeTime,
        })),
      );
    }
  });

  const hours = await db
    .select()
    .from(weeklyHours)
    .where(eq(weeklyHours.businessId, business.id))
    .orderBy(asc(weeklyHours.dayOfWeek));

  return Response.json({ hours });
}
