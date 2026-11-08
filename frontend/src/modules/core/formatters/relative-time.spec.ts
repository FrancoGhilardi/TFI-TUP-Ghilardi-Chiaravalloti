import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./relative-time";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe("formatRelativeTime", () => {
  it.each([
    [0, "hace instantes"],
    [59, "hace instantes"],
    [60, "hace 1 minuto"],
    [5 * 60, "hace 5 minutos"],
    [59 * 60, "hace 59 minutos"],
    [60 * 60, "hace 1 hora"],
    [23 * 3600, "hace 23 horas"],
    [24 * 3600, "hace 1 día"],
    [3 * 86400, "hace 3 días"],
    [29 * 86400, "hace 29 días"],
    [30 * 86400, "hace 1 mes"],
    [90 * 86400, "hace 3 meses"],
    [365 * 86400, "hace 1 año"],
    [800 * 86400, "hace 2 años"],
  ])("tells %is ago as %j", (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), NOW)).toBe(expected);
  });

  it("does not tell a time ahead of now as if it were to come", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 5 * 60 * 1000), NOW)).toBe("hace instantes");
  });
});
