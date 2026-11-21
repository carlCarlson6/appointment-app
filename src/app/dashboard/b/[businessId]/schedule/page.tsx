import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { OverridesManager } from "@/components/dashboard/OverridesManager";
import { WeeklyScheduleEditor } from "@/components/dashboard/WeeklyScheduleEditor";

export const instant = false;

export default async function SchedulePage(
  props: PageProps<"/dashboard/b/[businessId]/schedule">,
) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { businessId } = await props.params;
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business || business.ownerId !== userId) notFound();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium">Weekly hours</h2>
        <p className="mt-1 mb-4 text-sm text-zinc-500">
          Check the days you&apos;re open. Unchecked days are closed.
        </p>
        <WeeklyScheduleEditor businessId={business.id} />
      </section>

      <section>
        <h2 className="text-lg font-medium">Date exceptions</h2>
        <p className="mt-1 mb-4 text-sm text-zinc-500">
          Close a holiday, a vacation day, or open special hours on a specific
          date. Exceptions override the weekly hours.
        </p>
        <OverridesManager businessId={business.id} />
      </section>
    </div>
  );
}
