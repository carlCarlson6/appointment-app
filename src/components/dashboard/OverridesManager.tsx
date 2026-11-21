"use client";

import { useEffect, useState } from "react";

type Override = {
  id: string;
  date: string;
  kind: "blocked" | "hours";
  openTime: string | null;
  closeTime: string | null;
};

export function OverridesManager({ businessId }: { businessId: string }) {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [date, setDate] = useState("");
  const [kind, setKind] = useState<"blocked" | "hours">("blocked");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/me/businesses/${businessId}/overrides`);
        if (cancelled) return;
        if (!res.ok) {
          setError("Could not load overrides");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setOverrides(
          [...data.overrides].sort((a, b) => a.date.localeCompare(b.date)),
        );
        setLoading(false);
      } catch {
        if (!cancelled) setError("Could not load overrides");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, refreshKey]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/me/businesses/${businessId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          kind,
          openTime: kind === "hours" ? openTime : null,
          closeTime: kind === "hours" ? closeTime : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(data?.error ?? "Could not add override");
        return;
      }
      setDate("");
      setRefreshKey((k) => k + 1);
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(
        `/api/me/businesses/${businessId}/overrides/${id}`,
        { method: "DELETE" },
      );
      if (res.ok) setOverrides((prev) => prev.filter((o) => o.id !== id));
    } catch {
      setError("Network error");
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={add}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <div>
          <label htmlFor="ovDate" className="block text-xs font-medium text-zinc-500">
            Date
          </label>
          <input
            id="ovDate"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="ovKind" className="block text-xs font-medium text-zinc-500">
            Type
          </label>
          <select
            id="ovKind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "blocked" | "hours")}
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="blocked">Closed all day</option>
            <option value="hours">Custom hours</option>
          </select>
        </div>
        {kind === "hours" ? (
          <>
            <div>
              <label htmlFor="ovOpen" className="block text-xs font-medium text-zinc-500">
                Open
              </label>
              <input
                id="ovOpen"
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ovClose" className="block text-xs font-medium text-zinc-500">
                Close
              </label>
              <input
                id="ovClose"
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add exception"}
        </button>
        {formError ? <p className="w-full text-sm text-red-600">{formError}</p> : null}
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : overrides.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No exceptions yet. Add one to close a holiday or open special hours.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {overrides.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <span className="font-medium">{o.date}</span>
                <span className="ml-3 text-zinc-500">
                  {o.kind === "blocked"
                    ? "Closed all day"
                    : `Custom hours: ${o.openTime} – ${o.closeTime}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void remove(o.id)}
                className="text-xs text-zinc-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
