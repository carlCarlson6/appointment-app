"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OwnerCancelButton({
  businessId,
  bookingId,
  label = "Cancel",
}: {
  businessId: string;
  bookingId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("Cancel this booking? The client will be notified.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/me/businesses/${businessId}/bookings/${bookingId}/cancel`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not cancel");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
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
        className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
      >
        {busy ? "…" : label}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
