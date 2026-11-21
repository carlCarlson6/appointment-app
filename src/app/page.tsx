import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const instant = false;

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Bookr
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700">
                  Create your business
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100"
              >
                Dashboard
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Appointments your clients can book in seconds
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600">
          Create your business, set your weekly availability, block spots
          that are already taken — and share a link your clients can book
          from, no account required.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                Create your business
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Open your dashboard
            </Link>
          </Show>
          <Link
            href="/b/demo"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            See a demo booking page
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-400">
        Bookr — built with Next.js, Neon &amp; Drizzle
      </footer>
    </div>
  );
}
