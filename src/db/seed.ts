/**
 * Seed a demo business so the booking flow can be tried immediately:
 *
 *   npm run db:seed
 *
 * Creates "Sunny Cuts Barbershop" (booking page: /b/demo) with weekly
 * hours Mon–Sat and two services. The owner is a placeholder user ID —
 * to manage it from the dashboard, either change OWNER_ID below to your
 * Clerk user ID (the `sub` you see in `await auth()`) or just create your
 * own business from the dashboard after signing in.
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { businesses, services, weeklyHours } from "./schema";

const OWNER_ID = process.env.SEED_OWNER_ID ?? "seed-owner";

async function main() {
  const existing = await db.query.businesses.findFirst({
    where: eq(businesses.slug, "demo"),
  });
  if (existing) {
    console.log("Demo business already exists — nothing to do.");
    console.log(`Booking page: http://localhost:3000/b/${existing.slug}`);
    return;
  }

  const [business] = await db
    .insert(businesses)
    .values({
      ownerId: OWNER_ID,
      name: "Sunny Cuts Barbershop",
      slug: "demo",
      timezone: "America/New_York",
      slotStepMinutes: 30,
      bookingAdvanceDays: 30,
    })
    .returning();

  await db.insert(services).values([
    {
      businessId: business.id,
      name: "Haircut",
      description: "Classic cut and style",
      durationMinutes: 30,
      priceCents: 2500,
      position: 1,
    },
    {
      businessId: business.id,
      name: "Haircut & Beard",
      description: "Full cut with beard trim and hot towel",
      durationMinutes: 60,
      priceCents: 4000,
      position: 2,
    },
  ]);

  await db.insert(weeklyHours).values([
    { businessId: business.id, dayOfWeek: 1, openTime: "09:00", closeTime: "17:00" },
    { businessId: business.id, dayOfWeek: 2, openTime: "09:00", closeTime: "17:00" },
    { businessId: business.id, dayOfWeek: 3, openTime: "09:00", closeTime: "17:00" },
    { businessId: business.id, dayOfWeek: 4, openTime: "09:00", closeTime: "17:00" },
    { businessId: business.id, dayOfWeek: 5, openTime: "09:00", closeTime: "17:00" },
    { businessId: business.id, dayOfWeek: 6, openTime: "10:00", closeTime: "15:00" },
  ]);

  console.log("Seeded demo business:");
  console.log(`  Booking page: http://localhost:3000/b/${business.slug}`);
  console.log(`  Owner ID: ${OWNER_ID} (placeholder unless you set SEED_OWNER_ID)`);
  console.log("Sign in and create your own business from /dashboard to try the owner side.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
