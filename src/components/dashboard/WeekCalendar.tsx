"use client";

import { useEffect, useMemo, useState } from "react";
import { formatInTz } from "@/lib/format";

type BookingEvent = {
  id: string;
  startTime: string;
  endTime: string;
  clientName: string;
  status: string;
};

type BlockEvent = {
  id: string;
  startTime: string;
  endTime: string;
};

/** Wall-clock "now" components in a given IANA timezone. */
function nowInTz(tz: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")),
  );
}

/** Start of the business-local day for a Date in business time. */
function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;

export function WeekCalendar({
  businessId,
  timezone,
  stepMinutes,
}: {
  businessId: string;
  timezone: string;
  stepMinutes: number;
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => dayStart(nowInTz(timezone)));
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [blocks, setBlocks] = useState<BlockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = useMemo(
    () => new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
    [weekStart],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          from: weekStart.toISOString(),
          to: weekEnd.toISOString(),
        });
        const [bRes, blRes] = await Promise.all([
          fetch(`/api/me/businesses/${businessId}/bookings?${params}`),
          fetch(`/api/me/businesses/${businessId}/blocks?${params}`),
        ]);
        if (cancelled) return;
        if (!bRes.ok || !blRes.ok) {
          setError("Could not load the calendar");
          return;
        }
        const bData = await bRes.json();
        const blData = await blRes.json();
        if (cancelled) return;
        setBookings(
          (bData.bookings as BookingEvent[]).filter((b) => b.status === "confirmed"),
        );
        setBlocks(blData.blocks as BlockEvent[]);
        setError(null);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, weekStart, weekEnd]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    });
  }, [weekStart]);

  const rowStarts = useMemo(() => {
    const rows: Date[] = [];
    const rowMs = stepMinutes * 60 * 1000;
    for (
      let t = GRID_START_HOUR * 60 * 60 * 1000;
      t < (GRID_END_HOUR - GRID_START_HOUR) * 60 * 60 * 1000;
      t += rowMs
    ) {
      rows.push(new Date(weekStart.getTime() + t));
    }
    return rows;
  }, [weekStart, stepMinutes]);

  async function toggleCell(cellStart: Date, cellEnd: Date) {
    const existing = blocks.find(
      (b) => b.startTime === cellStart.toISOString(),
    );
    if (existing) {
      const res = await fetch(
        `/api/me/businesses/${businessId}/blocks/${existing.id}`,
        { method: "DELETE" },
      );
      if (res.ok) setBlocks((prev) => prev.filter((b) => b.id !== existing.id));
      return;
    }
    const booking = bookings.find(
      (b) => new Date(b.startTime) <= cellStart && new Date(b.endTime) >= cellEnd,
    );
    if (booking) return; // don't allow blocking over a booking
    const res = await fetch(`/api/me/businesses/${businessId}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: cellStart.toISOString(),
        endTime: cellEnd.toISOString(),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setBlocks((prev) => [
        ...prev,
        { id: data.block.id, startTime: cellStart.toISOString(), endTime: cellEnd.toISOString() },
      ]);
    }
  }

  function isBlocked(cellStart: Date): boolean {
    return blocks.some((b) => b.startTime === cellStart.toISOString());
  }

  function bookingAt(cellStart: Date): BookingEvent | null {
    const cellEnd = new Date(cellStart.getTime() + stepMinutes * 60 * 1000);
    return (
      bookings.find(
        (b) =>
          new Date(b.startTime) <= cellStart &&
          new Date(b.endTime) >= cellEnd,
      ) ?? null
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setWeekStart((w) => new Date(w.getTime() - 7 * 24 * 60 * 60 * 1000));
            }}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setWeekStart((w) => new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000));
            }}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setWeekStart(dayStart(nowInTz(timezone)));
            }}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-100 ring-1 ring-green-300" />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-zinc-200" />
            Blocked
          </span>
          <span className="text-zinc-400">
            Click an empty slot to block it · click a blocked slot to unblock
          </span>
        </div>
      </div>

      {loading ? <p className="p-5 text-sm text-zinc-400">Loading…</p> : null}
      {error ? <p className="p-5 text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-zinc-100">
            <div className="px-2 py-2 text-xs text-zinc-400">Timezone: {timezone}</div>
            {days.map((d) => (
              <div key={d.start.toISOString()} className="px-2 py-2 text-center">
                <p className="text-xs font-medium">
                  {formatInTz(d.start.toISOString(), timezone, { weekday: "short" })}
                </p>
                <p className="text-xs text-zinc-400">
                  {formatInTz(d.start.toISOString(), timezone, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[64px_repeat(7,1fr)]">
            {rowStarts.map((rowStart) => {
              return [
                <div
                  key={`label-${rowStart.toISOString()}`}
                  className="border-b border-zinc-50 px-2 py-1 text-right text-[10px] text-zinc-400"
                >
                  {formatInTz(rowStart.toISOString(), timezone, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>,
                ...days.map((day) => {
                  const cellStart = new Date(
                    rowStart.getTime() +
                      (day.start.getTime() - weekStart.getTime()),
                  );
                  const cellEnd = new Date(cellStart.getTime() + stepMinutes * 60 * 1000);
                  const booking = bookingAt(cellStart);
                  const blocked = isBlocked(cellStart);
                  const inPast = cellStart.getTime() <= Date.now();

                  let className =
                    "border-b border-r border-zinc-50 text-center align-middle text-[10px] transition ";
                  let content: React.ReactNode = null;
                  let title = "";

                  if (booking) {
                    className += "bg-green-100 text-green-900";
                    const isStart =
                      Math.abs(new Date(booking.startTime).getTime() - cellStart.getTime()) <
                      stepMinutes * 60 * 1000;
                    content = isStart ? booking.clientName : "";
                    title = `${booking.clientName}`;
                  } else if (blocked) {
                    className += "bg-zinc-200 text-zinc-500 cursor-pointer";
                    const block = blocks.find(
                      (b) => b.startTime === cellStart.toISOString(),
                    );
                    const isStart = !!block;
                    content = isStart ? "Blocked" : "";
                    title = "Click to unblock";
                  } else {
                    className += "hover:bg-zinc-50 cursor-pointer";
                    title = inPast ? "" : "Click to block";
                  }

                  return (
                    <div
                      key={`${day.start.toISOString()}-${rowStart.toISOString()}`}
                      role="button"
                      tabIndex={0}
                      title={title}
                      onClick={() => {
                        if (booking || inPast) return;
                        void toggleCell(cellStart, cellEnd);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (booking || inPast) return;
                          void toggleCell(cellStart, cellEnd);
                        }
                      }}
                      className={className}
                      style={{ minHeight: 28 }}
                    >
                      {content}
                    </div>
                  );
                }),
              ];
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
