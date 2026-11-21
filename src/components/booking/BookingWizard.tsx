"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { currentMonthKey, dateKeyInTz, shiftMonthKey } from "@/lib/calendar";
import { formatDateLabel, formatDuration, formatLocalTime, formatPrice } from "@/lib/format";
import { MonthCalendar } from "./MonthCalendar";

type ServicePublic = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
};

type BusinessPublic = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

type Availability = {
  timezone: string;
  from: string;
  to: string;
  service: ServicePublic;
  dates: Array<{ date: string; slots: Array<{ start: string; end: string }> }>;
};

export function BookingWizard({
  business,
  services,
}: {
  business: BusinessPublic;
  services: ServicePublic[];
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Browsed month ("yyyy-MM", business-local). Lives here so it survives the
  // loading gate, service switches and 409 refetches. Lazily initialized; the
  // grid is only rendered in the post-fetch (client-side) branch, so
  // month-dependent output is never server-rendered.
  const [visibleMonth, setVisibleMonth] = useState<string>(() =>
    currentMonthKey(business.timezone, new Date()),
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loading =
    !availability || availability.service.id !== serviceId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serviceId) return;
      try {
        const res = await fetch(
          `/api/businesses/${business.slug}/availability?serviceId=${serviceId}&days=60`,
        );
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setLoadError(data?.error ?? "Could not load availability");
          return;
        }
        setAvailability((await res.json()) as Availability);
        setLoadError(null);
        setSelectedDate(null);
        setSelectedSlot(null);
      } catch {
        if (!cancelled) setLoadError("Network error while loading availability");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId, business.slug, refreshKey]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Availability["dates"][number]["slots"]>();
    for (const d of availability?.dates ?? []) map.set(d.date, d.slots);
    return map;
  }, [availability]);

  const slotCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of availability?.dates ?? []) map.set(d.date, d.slots.length);
    return map;
  }, [availability]);

  const selectedSlots = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  // Business-local "now" and the end of the bookable window (render-time
  // compute; only consumed by the post-fetch client-side render).
  const todayKey = dateKeyInTz(new Date(), business.timezone);
  const windowEndKey = availability
    ? dateKeyInTz(new Date(availability.to), availability.timezone)
    : todayKey;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/businesses/${business.slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startTime: selectedSlot,
          clientName: name,
          clientEmail: email,
          clientPhone: phone || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSubmitError(data?.error ?? "Could not book. Try again.");
        if (res.status === 409) {
          // The slot was taken; refresh availability and reset selection.
          setSelectedSlot(null);
          setRefreshKey((k) => k + 1);
        }
        return;
      }
      router.push(data.confirmationUrl);
    } catch {
      setSubmitError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const service = services.find((s) => s.id === serviceId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Step 1: service */}
      <section>
        <h2 className="text-sm font-medium text-zinc-500">1. Choose a service</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id)}
              className={`rounded-xl border p-4 text-left transition ${
                s.id === serviceId
                  ? "border-zinc-900 ring-1 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-zinc-500">{formatDuration(s.durationMinutes)}</span>
              </div>
              {s.description ? (
                <p className="mt-1 text-sm text-zinc-500">{s.description}</p>
              ) : null}
              {s.priceCents != null ? (
                <p className="mt-1 text-sm font-medium">{formatPrice(s.priceCents)}</p>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: date */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-zinc-500">2. Pick a day</h2>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-400">Loading availability…</p>
        ) : loadError ? (
          <p className="mt-3 text-sm text-red-600">{loadError}</p>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-zinc-400">
              All dates shown in the business&apos;s timezone ({business.timezone})
            </p>
            <div className="mt-2">
              <MonthCalendar
                monthKey={visibleMonth}
                timezone={business.timezone}
                todayKey={todayKey}
                windowEndKey={windowEndKey}
                selectedDate={selectedDate}
                slotCountByDate={slotCounts}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                onPrevMonth={() => setVisibleMonth((m) => shiftMonthKey(m, -1))}
                onNextMonth={() => setVisibleMonth((m) => shiftMonthKey(m, 1))}
                onToday={() =>
                  setVisibleMonth(currentMonthKey(business.timezone, new Date()))
                }
              />
            </div>
          </div>
        )}
      </section>

      {/* Step 3: slot */}
      {selectedDate ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-zinc-500">3. Pick a time</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Times shown in your local time
            {availability && availability.timezone !== localTz()
              ? ` · business timezone: ${availability.timezone}`
              : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSlots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSelectedSlot(slot.start)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  selectedSlot === slot.start
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                {formatLocalTime(slot.start)}
              </button>
            ))}
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-zinc-400">No times available on this day.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Step 4: details */}
      {selectedSlot ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-500">4. Your details</h2>
          <form onSubmit={submit} className="mt-3 max-w-md space-y-3">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium">
                Name
              </label>
              <input
                id="clientName"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label htmlFor="clientEmail" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="clientEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label htmlFor="clientPhone" className="block text-sm font-medium">
                Phone <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="clientPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                placeholder="+1 555 123 4567"
              />
            </div>
            {submitError ? (
              <p className="text-sm text-red-600">{submitError}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {submitting
                ? "Booking…"
                : `Confirm ${service ? service.name : ""} on ${formatDateLabel(selectedDate ?? "")} at ${formatLocalTime(selectedSlot)}`}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function localTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
