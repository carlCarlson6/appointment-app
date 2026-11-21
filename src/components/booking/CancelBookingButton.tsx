"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelBookingButton({
  cancelUrl,
  start,
}: {
  cancelUrl: string;
  start: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (new Date(start).getTime() <= Date.now()) {
      setError("This booking is in the past and cannot be cancelled.");
      return;
    }
    if (!window.confirm("Cancel this booking?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(cancelUrl, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not cancel. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Cancelling…" : "Cancel booking"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
