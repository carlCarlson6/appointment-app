import { and, asc, eq, gt, lt } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { bookings, businesses, services } from "@/db/schema";
import { OwnerCancelButton } from "@/components/dashboard/OwnerCancelButton";
import { formatSlotInTz } from "@/lib/format";

export const instant = false;

export default async function BusinessOverviewPage(
  props: PageProps<"/dashboard/b/[businessId]">,
) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { businessId } = await props.params;
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business || business.ownerId !== userId) notFound();

  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcoming, upcoming7] = await Promise.all([
    db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.businessId, business.id),
          eq(bookings.status, "confirmed"),
          gt(bookings.startTime, now),
        ),
      )
      .orderBy(asc(bookings.startTime))
      .limit(20),
    db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.businessId, business.id),
          eq(bookings.status, "confirmed"),
          gt(bookings.startTime, now),
          lt(bookings.startTime, next7),
        ),
      ),
  ]);

  const serviceRows = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(eq(services.businessId, business.id));
  const serviceName = new Map(serviceRows.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Bookings next 7 days</p>
          <p className="mt-1 text-3xl font-semibold">{upcoming7.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Booking page</p>
          <a
            href={`/b/${business.slug}`}
            target="_blank"
            className="mt-1 block font-mono text-sm text-zinc-900 underline-offset-2 hover:underline"
          >
            /b/{business.slug} ↗
          </a>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Timezone</p>
          <p className="mt-1 font-mono text-sm">{business.timezone}</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium">Upcoming bookings</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No upcoming bookings. Share your booking page to start receiving
            appointments.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {upcoming.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {serviceName.get(b.serviceId) ?? "Service"} — {b.clientName}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatSlotInTz(b.startTime.toISOString(), business.timezone)} (
                    {business.timezone})
                  </p>
                  <p className="text-xs text-zinc-400">
                    {b.clientEmail}
                    {b.clientPhone ? ` · ${b.clientPhone}` : ""}
                  </p>
                </div>
                <OwnerCancelButton
                  businessId={business.id}
                  bookingId={b.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
