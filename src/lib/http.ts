import { NextResponse } from "next/server";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Parse a JSON body; returns null when the body is missing or invalid. */
export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Slugify a business name: "Sunny Cuts!" -> "sunny-cuts" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Postgres error code from a driver or Drizzle error.
 * Drizzle wraps driver errors (code lives in `cause`).
 */
export function pgErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as { code?: unknown; cause?: { code?: unknown } };
  for (const v of [e.code, e.cause?.code]) {
    if (typeof v === "string") return v;
  }
  return null;
}
