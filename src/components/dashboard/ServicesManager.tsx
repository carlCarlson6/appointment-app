"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatPrice } from "@/lib/format";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
  active: boolean;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  durationMinutes: 30,
  priceCents: "",
};

export function ServicesManager({ businessId }: { businessId: string }) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/me/businesses/${businessId}/services`);
        if (cancelled) return;
        if (!res.ok) {
          setError("Could not load services");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setServices(data.services as ServiceRow[]);
        setLoading(false);
      } catch {
        if (!cancelled) setError("Could not load services");
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
      const res = await fetch(`/api/me/businesses/${businessId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          durationMinutes: form.durationMinutes,
          priceCents: form.priceCents
            ? Math.round(Number(form.priceCents) * 100)
            : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(data?.error ?? "Could not add service");
        return;
      }
      setForm(EMPTY_FORM);
      setRefreshKey((k) => k + 1);
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, values: Record<string, unknown>) {
    const res = await fetch(`/api/me/businesses/${businessId}/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) setRefreshKey((k) => k + 1);
    return res;
  }

  async function toggleActive(s: ServiceRow) {
    void patch(s.id, { active: !s.active });
  }

  async function remove(s: ServiceRow) {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    const res = await fetch(`/api/me/businesses/${businessId}/services/${s.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRefreshKey((k) => k + 1);
    } else {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? "Could not delete service");
    }
  }

  async function saveEdit(s: ServiceRow) {
    const res = await patch(s.id, {
      name: editForm.name,
      description: editForm.description || null,
      durationMinutes: editForm.durationMinutes,
      priceCents: editForm.priceCents
        ? Math.round(Number(editForm.priceCents) * 100)
        : null,
    });
    if (res.ok) setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={add}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h3 className="text-sm font-medium">Add a service</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="svcName" className="block text-xs font-medium text-zinc-500">
              Name
            </label>
            <input
              id="svcName"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Haircut"
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="svcDuration" className="block text-xs font-medium text-zinc-500">
              Duration (minutes)
            </label>
            <input
              id="svcDuration"
              type="number"
              min={5}
              max={1440}
              required
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="svcDesc" className="block text-xs font-medium text-zinc-500">
              Description (optional)
            </label>
            <input
              id="svcDesc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Classic cut and style"
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="svcPrice" className="block text-xs font-medium text-zinc-500">
              Price in USD (optional)
            </label>
            <input
              id="svcPrice"
              type="number"
              min={0}
              step="0.01"
              value={form.priceCents}
              onChange={(e) =>
                setForm((f) => ({ ...f, priceCents: e.target.value }))
              }
              placeholder="25.00"
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>
        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add service"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No services yet — clients can&apos;t book anything until you add one.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {services.map((s) =>
            editingId === s.id ? (
              <li key={s.id} className="space-y-3 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={editForm.durationMinutes}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        durationMinutes: Number(e.target.value),
                      }))
                    }
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Description"
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none sm:col-span-2"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.priceCents}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, priceCents: e.target.value }))
                    }
                    placeholder="Price (USD)"
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEdit(s)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.name}
                    {!s.active ? (
                      <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                        inactive
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatDuration(s.durationMinutes)}
                    {s.priceCents != null ? ` · ${formatPrice(s.priceCents)}` : ""}
                    {s.description ? ` — ${s.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 text-zinc-500">
                    <input
                      type="checkbox"
                      checked={s.active}
                      onChange={() => void toggleActive(s)}
                      className="h-3.5 w-3.5"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(s.id);
                      setEditForm({
                        name: s.name,
                        description: s.description ?? "",
                        durationMinutes: s.durationMinutes,
                        priceCents:
                          s.priceCents != null ? String(s.priceCents / 100) : "",
                      });
                    }}
                    className="text-zinc-500 hover:text-zinc-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(s)}
                    className="text-zinc-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
