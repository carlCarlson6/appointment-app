import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TabNav } from "@/components/dashboard/TabNav";

export const instant = false;

export default async function BusinessLayout(
  props: LayoutProps<"/dashboard/b/[businessId]">,
) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { businessId } = await props.params;
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business || business.ownerId !== userId) notFound();

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <Link
                href="/dashboard"
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                ← Businesses
              </Link>
              <h1 className="text-lg font-semibold tracking-tight">
                {business.name}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/b/${business.slug}`}
                target="_blank"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Open booking page ↗
              </Link>
              <UserButton />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-6">
          <TabNav businessId={business.id} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{props.children}</main>
    </div>
  );
}
