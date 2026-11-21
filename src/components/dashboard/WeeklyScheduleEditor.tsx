"use client";

import { useEffect, useState } from "react";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type DayState = {
  enabled: boolean;
  openTime: string;
  closeTime: string;
};

const DEFAULT_STATE: DayState[] = DAY_NAMES.map((_, dayOfWeek) => ({
  enabled: dayOfWeek >= 1 && dayOfWeek <= 5, // Mon–Fri by default
  openTime: "09:00",
  closeTime: "17:00",
}));

export function WeeklyScheduleEditor({ businessId }: { businessId: string }) {
  const [days, setDays] = useState<DayState[]>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/me/businesses/${businessId}/schedule`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hours) {
          setDays(
            DAY_NAMES.map((_, dayOfWeek) => {
              const row = data.hours.find(
                (h: { dayOfWeek: number }) => h.dayOfWeek === dayOfWeek,
              );
              return row
                ? { enabled: true, openTime: row.openTime, closeTime: row.closeTime }
                : { enabled: false, openTime: "09:00", closeTime: "17:00" };
            }),
          );
        }
      })
      .catch(() => setError("Could not load schedule"))
      .finally(() => setLoading(false));
  }, [businessId]);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const payload = {
      days: days
        .map((d, dayOfWeek) => ({ ...d, dayOfWeek }))
        .filter((d) => d.enabled),
    };
    try {
      const res = await fetch(`/api/me/businesses/${businessId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not save schedule");
        return;
      }
      setMessage("Schedule saved.");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-zinc-400">Loading…</p>;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <ul className="divide-y divide-zinc-100">
        {days.map((day, dayOfWeek) => (
          <li key={dayOfWeek} className="flex items-center gap-4 px-5 py-3">
            <label className="flex w-32 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) =>
                  setDays((prev) =>
                    prev.map((d, i) =>
                      i === dayOfWeek ? { ...d, enabled: e.target.checked } : d,
                    ),
                  )
                }
                className="h-4 w-4"
              />
              {DAY_NAMES[dayOfWeek]}
            </label>
            {day.enabled ? (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  value={day.openTime}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((d, i) =>
                        i === dayOfWeek ? { ...d, openTime: e.target.value } : d,
                      ),
                    )
                  }
                  className="rounded-md border border-zinc-300 px-2 py-1 focus:border-zinc-900 focus:outline-none"
                />
                <span className="text-zinc-400">to</span>
                <input
                  type="time"
                  value={day.closeTime}
                  onChange={(e) =>
                    setDays((prev) =>
                      prev.map((d, i) =>
                        i === dayOfWeek ? { ...d, closeTime: e.target.value } : d,
                      ),
                    )
                  }
                  className="rounded-md border border-zinc-300 px-2 py-1 focus:border-zinc-900 focus:outline-none"
                />
              </div>
            ) : (
              <span className="text-sm text-zinc-400">Closed</span>
            )}
          </li>
        ))}
      </ul>
      <div className="border-t border-zinc-100 px-5 py-4">
        {message ? (
          <p className="mb-2 text-sm text-green-700">{message}</p>
        ) : null}
        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save schedule"}
        </button>
      </div>
    </div>
  );
}
