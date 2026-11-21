import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { bookings, businesses, services } from "@/db/schema";
import { CancelBookingButton } from "@/components/booking/CancelBookingButton";
import { formatSlotInTz } from "@/lib/format";

export const instant = false;

export default async function BookedPage(
  props: PageProps<"/b/[slug]/booked/[token]">,
) {
  const { slug, token } = await props.params;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.cancelToken, token),
  });
  if (!booking) notFound();

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, booking.businessId),
  });
  if (!business || business.slug !== slug) notFound();

  const service = await db.query.services.findFirst({
    where: eq(services.id, booking.serviceId),
  });

  const isCancelled = booking.status === "cancelled";

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-16">
      <div className="rounded-2xl border border-zinc-200 p-8 text-center">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            isCancelled ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
          }`}
        >
          {isCancelled ? "✕" : "✓"}
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {isCancelled ? "Booking cancelled" : "You're booked!"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isCancelled
            ? "This appointment was cancelled."
            : `A confirmation email was sent to ${booking.clientEmail}.`}
        </p>

        <dl className="mt-8 space-y-3 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Business</dt>
            <dd className="text-right font-medium">{business.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Service</dt>
            <dd className="text-right font-medium">{service?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">When</dt>
            <dd className="text-right font-medium">
              {formatSlotInTz(booking.startTime.toISOString(), business.timezone)}
              <span className="block text-xs font-normal text-zinc-400">
                {business.timezone}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Name</dt>
            <dd className="text-right font-medium">{booking.clientName}</dd>
          </div>
        </dl>

        <div className="mt-8 flex justify-center">
          {!isCancelled ? (
            <CancelBookingButton
              cancelUrl={`/api/bookings/${booking.cancelToken}/cancel`}
              start={booking.startTime.toISOString()}
            />
          ) : null}
        </div>
      </div>

      <p className="mt-8 text-center">
        <Link
          href={`/b/${business.slug}`}
          className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline"
        >
          Book another appointment at {business.name}
        </Link>
      </p>
    </div>
  );
}
