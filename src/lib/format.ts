/** Format an ISO UTC instant in a given IANA timezone. */
export function formatInTz(
  iso: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: timezone, ...options });
}

/** "Mon, Nov 24 · 2:30 PM" in the given timezone. */
export function formatSlotInTz(iso: string, timezone: string): string {
  return formatInTz(iso, timezone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "2:30 PM" in the viewer's local timezone. */
export function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The viewer's IANA timezone name, when available. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** "yyyy-MM-dd" (business-local) -> "Mon, Nov 24". */
export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatPrice(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
