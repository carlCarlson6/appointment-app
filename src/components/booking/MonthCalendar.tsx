"use client";

import { useMemo } from "react";
import { formatDateLabel } from "@/lib/format";
import {
  buildMonthGrid,
  canGoNext,
  canGoPrev,
  monthKeyOf,
  monthLabel,
} from "@/lib/calendar";

// Order matches WEEK_STARTS_ON = 1 (Monday-first).
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const NAV_BUTTON_CLASS =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";

type MonthCalendarProps = {
  /** Visible "yyyy-MM" month (business-local). */
  monthKey: string;
  /** Business IANA timezone. */
  timezone: string;
  /** Business-local "yyyy-MM-dd" of now. */
  todayKey: string;
  /** Last bookable date key (availability.to in the business timezone). */
  windowEndKey: string;
  selectedDate: string | null;
  /** date -> number of available slots */
  slotCountByDate: ReadonlyMap<string, number>;
  onSelect: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

export function MonthCalendar({
  monthKey,
  timezone,
  todayKey,
  windowEndKey,
  selectedDate,
  slotCountByDate,
  onSelect,
  onPrevMonth,
  onNextMonth,
  onToday,
}: MonthCalendarProps) {
  const cells = useMemo(
    () => buildMonthGrid(timezone, monthKey),
    [timezone, monthKey],
  );

  const todayMonthKey = monthKeyOf(todayKey);
  const showToday = monthKey !== todayMonthKey;

  return (
    <div>
      <div className="grid grid-cols-3 items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            disabled={!canGoPrev(monthKey, todayMonthKey)}
            onClick={onPrevMonth}
            className={NAV_BUTTON_CLASS}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={!canGoNext(monthKey, windowEndKey)}
            onClick={onNextMonth}
            className={NAV_BUTTON_CLASS}
          >
            →
          </button>
        </div>
        <span className="text-center text-sm font-medium">
          {monthLabel(timezone, monthKey)}
        </span>
        <div className="flex justify-end">
          {showToday ? (
            <button
              type="button"
              onClick={onToday}
              className="text-xs text-zinc-500 underline hover:text-zinc-900"
            >
              Today
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] text-zinc-400">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const slotCount = slotCountByDate.get(cell.date) ?? 0;
          const isSelected = selectedDate === cell.date;
          const isToday = cell.date === todayKey && cell.inMonth;
          const hasSlots = cell.inMonth && slotCount > 0;

          let cellClass =
            "flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-sm ";
          if (isSelected) {
            cellClass += "border border-zinc-900 bg-zinc-900 text-white ";
          } else if (hasSlots) {
            cellClass += "border border-zinc-200 hover:border-zinc-400 ";
          } else if (cell.inMonth) {
            cellClass += "cursor-not-allowed border border-zinc-100 text-zinc-300 ";
          } else {
            cellClass += "cursor-not-allowed border border-transparent text-zinc-300 ";
          }
          if (isToday && !isSelected) {
            cellClass += "bg-zinc-50 font-semibold ";
          }

          const ariaLabel = hasSlots
            ? `${formatDateLabel(cell.date)}, ${slotCount} time slot${slotCount === 1 ? "" : "s"} available`
            : `${formatDateLabel(cell.date)}, no availability`;

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!hasSlots}
              onClick={() => onSelect(cell.date)}
              title={
                hasSlots
                  ? `${slotCount} ${slotCount === 1 ? "slot" : "slots"} available`
                  : undefined
              }
              aria-label={ariaLabel}
              className={cellClass}
            >
              <span>{cell.day}</span>
              {hasSlots && !isSelected ? (
                <span className="h-1 w-1 rounded-full bg-green-500" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
