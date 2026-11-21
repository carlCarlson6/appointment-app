import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { CreateBusinessForm } from "@/components/dashboard/CreateBusinessForm";

export const instant = false;

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout protect() handles the redirect

  const list = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerId, userId))
    .orderBy(desc(businesses.createdAt));

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              Bookr
            </Link>
            <span className="ml-2 text-sm text-zinc-400">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
              Home
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Your businesses</h1>

        {list.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {list.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/b/${b.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
                >
                  <p className="font-medium">{b.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Booking page:{" "}
                    <span className="font-mono text-xs">/b/{b.slug}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">Timezone: {b.timezone}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-zinc-500">
            You don&apos;t have any businesses yet. Create your first one below.
          </p>
        )}

        <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium">Create a business</h2>
          <div className="mt-4">
            <CreateBusinessForm />
          </div>
        </section>
      </main>
    </div>
  );
}
