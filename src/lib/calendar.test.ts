import { describe, expect, it } from "vitest";
import { TZDate } from "@date-fns/tz";
import {
  WEEK_STARTS_ON,
  buildMonthGrid,
  canGoNext,
  canGoPrev,
  currentMonthKey,
  dateKeyInTz,
  monthKeyOf,
  monthLabel,
  shiftMonthKey,
} from "./calendar";

const TZ = "America/New_York";

/** Weekday (0 = Sunday) of a "yyyy-MM-dd" key in the given timezone. */
function weekdayInTz(dateKey: string, tz: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new TZDate(y, m - 1, d, tz).getDay();
}

describe("dateKeyInTz", () => {
  it("formats the business-local date across a timezone boundary", () => {
    const instant = new Date("2026-11-30T23:30:00Z");
    // 18:30 EST Nov 30 vs 08:30 JST Dec 1
    expect(dateKeyInTz(instant, "America/New_York")).toBe("2026-11-30");
    expect(dateKeyInTz(instant, "Asia/Tokyo")).toBe("2026-12-01");
  });
});

describe("monthKeyOf", () => {
  it("extracts the yyyy-MM prefix", () => {
    expect(monthKeyOf("2026-11-15")).toBe("2026-11");
    expect(monthKeyOf("2027-01-05")).toBe("2027-01");
  });
});

describe("currentMonthKey", () => {
  it("returns the business-local month of the instant", () => {
    const instant = new Date("2026-11-30T23:30:00Z");
    expect(currentMonthKey("America/New_York", instant)).toBe("2026-11");
    expect(currentMonthKey("Asia/Tokyo", instant)).toBe("2026-12");
  });
});

describe("shiftMonthKey", () => {
  it("shifts forward over a year boundary", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("shifts backward over a year boundary", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("is the identity for delta 0", () => {
    expect(shiftMonthKey("2026-11", 0)).toBe("2026-11");
  });

  it("handles multi-month shifts", () => {
    expect(shiftMonthKey("2026-01", 12)).toBe("2027-01");
    expect(shiftMonthKey("2027-01", -12)).toBe("2026-01");
  });
});

describe("buildMonthGrid", () => {
  it("builds a Monday-first grid for November 2026 (starts on a Sunday)", () => {
    const grid = buildMonthGrid(TZ, "2026-11");

    // leading = (0 + 6) % 7 = 6; 6 + 30 + 6 = 42 cells
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ date: "2026-10-26", day: 26, inMonth: false });

    const leading = grid.slice(0, 6);
    expect(leading.map((c) => c.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
    ]);
    expect(leading.every((c) => !c.inMonth)).toBe(true);

    const inMonth = grid.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(30);
    expect(inMonth[0].date).toBe("2026-11-01");
    expect(inMonth[29].date).toBe("2026-11-30");

    expect(grid[41]).toEqual({ date: "2026-12-06", day: 6, inMonth: false });
  });

  it("starts at the first of the month when it is a Monday (June 2026)", () => {
    const grid = buildMonthGrid(TZ, "2026-06");

    // Jun 1 2026 is a Monday: leading = (1 + 6) % 7 = 0
    expect(grid).toHaveLength(35);
    expect(grid[0]).toEqual({ date: "2026-06-01", day: 1, inMonth: true });
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
  });

  it("offsets a mid-week month start to Monday (September 2026)", () => {
    const grid = buildMonthGrid(TZ, "2026-09");

    // Sep 1 2026 is a Tuesday: leading = (2 + 6) % 7 = 1
    expect(grid).toHaveLength(35);
    expect(grid[0]).toEqual({ date: "2026-08-31", day: 31, inMonth: false });
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
  });

  it("keeps structural invariants for several months", () => {
    for (const monthKey of ["2026-02", "2026-06", "2026-09", "2026-11", "2027-01"]) {
      const grid = buildMonthGrid(TZ, monthKey);

      // Total length is always a multiple of 7
      expect(grid.length % 7).toBe(0);

      // All out-of-month cells sit at the two ends (in-month cells are contiguous)
      const inMonthIndices = grid
        .map((c, i) => (c.inMonth ? i : -1))
        .filter((i) => i >= 0);
      for (let i = 1; i < inMonthIndices.length; i++) {
        expect(inMonthIndices[i]).toBe(inMonthIndices[i - 1] + 1);
      }

      // Every first column cell is a Monday
      for (let i = 0; i < grid.length; i += 7) {
        expect(weekdayInTz(grid[i].date, TZ)).toBe(WEEK_STARTS_ON);
      }
    }
  });
});

describe("canGoPrev", () => {
  it("allows browsing back to a month after the current month", () => {
    expect(canGoPrev("2026-12", "2026-11")).toBe(true);
  });

  it("disables going back at the current month", () => {
    expect(canGoPrev("2026-11", "2026-11")).toBe(false);
  });

  it("disables going back into the past", () => {
    expect(canGoPrev("2026-10", "2026-11")).toBe(false);
  });
});

describe("canGoNext", () => {
  it("allows browsing forward while the next month starts within the window", () => {
    // next month (2026-12-01) is before/at the window end
    expect(canGoNext("2026-11", "2026-12-20")).toBe(true);
  });

  it("allows the next month when its first day is the window end", () => {
    expect(canGoNext("2026-11", "2026-12-01")).toBe(true);
  });

  it("disables going forward once the next month starts beyond the window", () => {
    expect(canGoNext("2026-12", "2026-12-20")).toBe(false);
  });
});

describe("monthLabel", () => {
  it("formats the month name and year", () => {
    expect(monthLabel(TZ, "2026-11")).toBe("November 2026");
    expect(monthLabel(TZ, "2027-01")).toBe("January 2027");
  });
});
