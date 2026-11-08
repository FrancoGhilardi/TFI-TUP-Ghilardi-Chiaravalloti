import { describe, expect, it } from "vitest";

import { endOfDayIso, isPastDay, isValidDay, isoToDay } from "./day-input";

const ARGENTINA = -180;

describe("isValidDay", () => {
  it.each(["2026-12-01", "2028-02-29", "2026-01-31"])("accepts %s", (day) => {
    expect(isValidDay(day)).toBe(true);
  });

  it.each(["", "2026-13-01", "2026-02-30", "2027-02-29", "26-12-01", "2026/12/01", "hoy"])(
    "refuses %j",
    (day) => {
      expect(isValidDay(day)).toBe(false);
    },
  );
});

describe("endOfDayIso", () => {
  it.each([
    [-180, "2026-12-01T23:59:00-03:00"],
    [0, "2026-12-01T23:59:00+00:00"],
    [330, "2026-12-01T23:59:00+05:30"],
    [-570, "2026-12-01T23:59:00-09:30"],
  ])("writes the end of the day in a zone %i minutes from UTC", (offset, expected) => {
    expect(endOfDayIso("2026-12-01", offset)).toBe(expected);
  });

  it("is an instant that lasts through the whole day in that zone", () => {
    const instant = new Date(endOfDayIso("2026-12-01", ARGENTINA));

    expect(instant.toISOString()).toBe("2026-12-02T02:59:00.000Z");
  });
});

describe("isoToDay", () => {
  it("gives the day in the zone, not in UTC", () => {
    const instant = new Date("2026-12-02T02:59:00.000Z");

    expect(isoToDay(instant, ARGENTINA)).toBe("2026-12-01");
    expect(isoToDay(instant, 0)).toBe("2026-12-02");
  });

  it("gives back the day endOfDayIso was made from", () => {
    for (const offset of [ARGENTINA, 0, 330, -570]) {
      const instant = new Date(endOfDayIso("2026-12-01", offset));

      expect(isoToDay(instant, offset)).toBe("2026-12-01");
    }
  });
});

describe("isPastDay", () => {
  const now = new Date("2026-12-02T02:30:00.000Z");

  it("is true for a day before today in the zone", () => {
    expect(isPastDay("2026-11-30", now, ARGENTINA)).toBe(true);
  });

  it("takes today in the zone for today, even when UTC is already tomorrow", () => {
    expect(isPastDay("2026-12-01", now, ARGENTINA)).toBe(false);
    expect(isPastDay("2026-12-01", now, 0)).toBe(true);
  });

  it("is false for later days", () => {
    expect(isPastDay("2027-01-01", now, ARGENTINA)).toBe(false);
  });
});
