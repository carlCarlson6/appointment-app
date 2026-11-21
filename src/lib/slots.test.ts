import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import {
  generateSlots,
  groupSlotsByDate,
  isSlotBookable,
  type SlotEngineInput,
} from "./slots";

const TZ = "America/New_York";

const weeklyMonFri = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: "09:00",
  closeTime: "17:00",
}));

/** Tomorrow 00:00 in TZ, advanced forward to the target weekday (0-6). */
function nextWeekday(target: number): TZDate {
  const d = new TZDate(Date.now() + 24 * 60 * 60 * 1000, TZ);
  d.setHours(0, 0, 0, 0);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  return d;
}

function baseInput(
  overrides: Partial<SlotEngineInput> = {},
): SlotEngineInput {
  const monday = nextWeekday(1);
  return {
    timezone: TZ,
    slotStepMinutes: 30,
    durationMinutes: 30,
    weeklyHours: weeklyMonFri,
    overrides: [],
    occupied: [],
    fromUtc: monday,
    toUtc: new TZDate(monday.getTime() + 24 * 60 * 60 * 1000, TZ),
    ...overrides,
  };
}

function localIso(d: TZDate, h: number, m: number): string {
  return new Date(
    new TZDate(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      h,
      m,
      TZ,
    ).getTime(),
  ).toISOString();
}

describe("generateSlots", () => {
  it("generates slots on the step grid during open hours", () => {
    const monday = nextWeekday(1);
    const slots = generateSlots(baseInput());

    // 09:00 .. 16:30 in 30-min steps = 16 slots
    expect(slots).toHaveLength(16);
    expect(slots[0].start).toBe(localIso(monday, 9, 0));
    expect(slots[0].end).toBe(localIso(monday, 9, 30));
    expect(slots[15].start).toBe(localIso(monday, 16, 30));
    expect(slots[15].end).toBe(localIso(monday, 17, 0));
  });

  it("does not create slots that overflow closing time", () => {
    const slots = generateSlots(baseInput({ durationMinutes: 60 }));
    // 09:00 .. 16:00, hourly start on a 30-min grid = 15 slots
    expect(slots).toHaveLength(15);
    expect(slots[14].start).toBe(localIso(nextWeekday(1), 16, 0));
  });

  it("produces no slots on closed weekdays", () => {
    const sunday = nextWeekday(0);
    const slots = generateSlots(
      baseInput({
        fromUtc: sunday,
        toUtc: new TZDate(sunday.getTime() + 24 * 60 * 60 * 1000, TZ),
      }),
    );
    expect(slots).toHaveLength(0);
  });

  it("closes the whole day for a blocked override", () => {
    const monday = nextWeekday(1);
    const slots = generateSlots(
      baseInput({
        overrides: [{ date: format(monday, "yyyy-MM-dd"), kind: "blocked", openTime: null, closeTime: null }],
      }),
    );
    expect(slots).toHaveLength(0);
  });

  it("replaces weekly hours for an hours override", () => {
    const monday = nextWeekday(1);
    const slots = generateSlots(
      baseInput({
        overrides: [
          {
            date: format(monday, "yyyy-MM-dd"),
            kind: "hours",
            openTime: "10:00",
            closeTime: "12:00",
          },
        ],
      }),
    );
    expect(slots.map((s) => s.start)).toEqual([
      localIso(monday, 10, 0),
      localIso(monday, 10, 30),
      localIso(monday, 11, 0),
      localIso(monday, 11, 30),
    ]);
  });

  it("removes slots overlapping a booking", () => {
    const monday = nextWeekday(1);
    const occupied = [
      { start: new Date(localIso(monday, 10, 0)), end: new Date(localIso(monday, 10, 30)) },
    ];
    const slots = generateSlots(baseInput({ occupied }));
    expect(slots).toHaveLength(15);
    expect(slots.some((s) => s.start === localIso(monday, 10, 0))).toBe(false);
  });

  it("removes every slot covered by a long blocked range", () => {
    const monday = nextWeekday(1);
    const occupied = [
      { start: new Date(localIso(monday, 10, 0)), end: new Date(localIso(monday, 12, 0)) },
    ];
    const slots = generateSlots(baseInput({ occupied }));
    for (const h of [10, 11]) {
      expect(slots.some((s) => s.start === localIso(monday, h, 0))).toBe(false);
      expect(slots.some((s) => s.start === localIso(monday, h, 30))).toBe(false);
    }
    // A block ending at 12:00 does not cover the 12:00 slot.
    expect(slots.some((s) => s.start === localIso(monday, 12, 0))).toBe(true);
  });

  it("filters out slots that start in the past", () => {
    const now = new Date();
    const slots = generateSlots(
      baseInput({
        fromUtc: new Date(now.getTime() - 60 * 60 * 1000),
        toUtc: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      }),
    );
    for (const slot of slots) {
      expect(new Date(slot.start).getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("returns slots sorted by start time", () => {
    const slots = generateSlots(
      baseInput({
        toUtc: new TZDate(nextWeekday(1).getTime() + 7 * 24 * 60 * 60 * 1000, TZ),
      }),
    );
    const starts = slots.map((s) => s.start);
    expect(starts).toEqual([...starts].sort());
  });
});

describe("groupSlotsByDate", () => {
  it("groups slots by business-local date", () => {
    const monday = nextWeekday(1);
    const slots = [
      { start: localIso(monday, 9, 0), end: localIso(monday, 9, 30) },
      { start: localIso(monday, 10, 0), end: localIso(monday, 10, 30) },
    ];
    const grouped = groupSlotsByDate(slots, TZ);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].date).toBe(format(monday, "yyyy-MM-dd"));
    expect(grouped[0].slots).toHaveLength(2);
  });
});

describe("isSlotBookable", () => {
  it("accepts a free slot and rejects an occupied one", () => {
    const monday = nextWeekday(1);
    const input = baseInput();

    const free = new Date(localIso(monday, 9, 0));
    expect(isSlotBookable(free, input)).toBe(true);

    const blocked = new Date(localIso(monday, 9, 30));
    const occupiedInput = {
      ...input,
      occupied: [
        { start: new Date(localIso(monday, 9, 30)), end: new Date(localIso(monday, 10, 0)) },
      ],
    };
    expect(isSlotBookable(blocked, occupiedInput)).toBe(false);
  });

  it("rejects a start time that is not on the grid", () => {
    const monday = nextWeekday(1);
    const offGrid = new Date(localIso(monday, 9, 15));
    expect(isSlotBookable(offGrid, baseInput())).toBe(false);
  });

  it("rejects closed days", () => {
    const sunday = nextWeekday(0);
    const input = baseInput();
    expect(isSlotBookable(new Date(localIso(sunday, 10, 0)), input)).toBe(false);
  });
});
