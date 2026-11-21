import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { WeekCalendar } from "@/components/dashboard/WeekCalendar";

export const instant = false;

export default async function CalendarPage(
  props: PageProps<"/dashboard/b/[businessId]/calendar">,
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
        <h2 className="text-lg font-medium">Calendar</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Green cells are bookings. Grey cells are manually blocked slots —
          clients can&apos;t book them, and you can click them to unblock.
        </p>
      </div>
      <WeekCalendar
        businessId={business.id}
        timezone={business.timezone}
        stepMinutes={business.slotStepMinutes}
      />
    </div>
  );
}
