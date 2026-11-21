import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { ServicesManager } from "@/components/dashboard/ServicesManager";

export const instant = false;

export default async function ServicesPage(
  props: PageProps<"/dashboard/b/[businessId]/services">,
) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { businessId } = await props.params;
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business || business.ownerId !== userId) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Services</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Clients pick a service first when booking. Duration drives how much
          time each appointment takes on your calendar.
        </p>
      </div>
      <ServicesManager businessId={business.id} />
    </div>
  );
}
