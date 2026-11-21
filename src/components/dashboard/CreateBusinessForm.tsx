"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const COMMON_TZ = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Kyiv",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function CreateBusinessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [slotStep, setSlotStep] = useState(30);
  const [advanceDays, setAdvanceDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return COMMON_TZ;
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          slotStepMinutes: slotStep,
          bookingAdvanceDays: advanceDays,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not create business");
        return;
      }
      router.push(`/dashboard/b/${data.business.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div>
        <label htmlFor="bizName" className="block text-sm font-medium">
          Business name
        </label>
        <input
          id="bizName"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sunny Cuts Barbershop"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="bizTz" className="block text-sm font-medium">
          Timezone
        </label>
        <select
          id="bizTz"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        >
          {allTimezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-500">
          Advanced settings
        </summary>
        <div className="mt-3 space-y-4 rounded-lg border border-zinc-200 p-4">
          <div>
            <label htmlFor="slotStep" className="block text-sm font-medium">
              Slot grid — every {slotStep} minutes
            </label>
            <input
              id="slotStep"
              type="number"
              min={5}
              max={240}
              step={5}
              value={slotStep}
              onChange={(e) => setSlotStep(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Appointments start on this grid. A 60-min service on a 30-min
              grid takes two slots.
            </p>
          </div>
          <div>
            <label htmlFor="advanceDays" className="block text-sm font-medium">
              Clients can book up to {advanceDays} days ahead
            </label>
            <input
              id="advanceDays"
              type="number"
              min={1}
              max={365}
              value={advanceDays}
              onChange={(e) => setAdvanceDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>
      </details>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create business"}
      </button>
    </form>
  );
}
