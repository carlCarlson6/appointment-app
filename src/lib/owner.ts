import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";

/** The signed-in user's Clerk ID, or null for anonymous requests. */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/** A business owned by the given user, or null (also when it doesn't exist). */
export async function getOwnedBusiness(
  userId: string,
  businessId: string,
) {
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.id, businessId), eq(businesses.ownerId, userId)),
  });
  return business ?? null;
}
