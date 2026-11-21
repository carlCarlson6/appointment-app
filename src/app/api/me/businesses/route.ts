import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { jsonError, pgErrorCode, readJson, slugify } from "@/lib/http";
import { getUserId } from "@/lib/owner";
import { createBusinessSchema } from "@/lib/validators";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");

  const list = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerId, userId))
    .orderBy(desc(businesses.createdAt));

  return Response.json({ businesses: list });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "Unauthorized");

  const body = await readJson(req);
  const parsed = createBusinessSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid business");
  }
  const data = parsed.data;

  const baseSlug = data.slug ?? slugify(data.name) ?? "business";

  // Find a unique slug (base, base-2, base-3, ...).
  let slug = baseSlug;
  for (let i = 2; i < 100; i++) {
    const existing = await db.query.businesses.findFirst({
      where: eq(businesses.slug, slug),
    });
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  try {
    const [business] = await db
      .insert(businesses)
      .values({
        ownerId: userId,
        name: data.name,
        slug,
        timezone: data.timezone,
        slotStepMinutes: data.slotStepMinutes ?? 30,
        bookingAdvanceDays: data.bookingAdvanceDays ?? 30,
      })
      .returning();

    return Response.json({ business }, { status: 201 });
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      return jsonError(409, "That slug is already taken");
    }
    console.error("[business create error]", err);
    return jsonError(500, "Could not create business");
  }
}
