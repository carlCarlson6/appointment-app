import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { businesses, services } from "@/db/schema";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const instant = false;

export default async function BookingPage(
  props: PageProps<"/b/[slug]">,
) {
  const { slug } = await props.params;

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.slug, slug),
  });
  if (!business) notFound();

  const serviceRows = await db.query.services.findMany({
    where: eq(services.businessId, business.id),
  });
  const bookable = serviceRows.filter((s) => s.active);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10 text-center">
        <p className="text-sm font-medium text-zinc-400">Book an appointment</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{business.name}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          No account needed — just pick a service and a time.
        </p>
      </header>

      {bookable.length === 0 ? (
        <p className="text-center text-zinc-500">
          This business has no bookable services yet. Please check back later.
        </p>
      ) : (
        <BookingWizard
          business={{
            id: business.id,
            name: business.name,
            slug: business.slug,
            timezone: business.timezone,
          }}
          services={bookable}
        />
      )}

      <footer className="mt-16 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400">
        <Link href="/" className="hover:text-zinc-600">
          Powered by Bookr
        </Link>
      </footer>
    </div>
  );
}
