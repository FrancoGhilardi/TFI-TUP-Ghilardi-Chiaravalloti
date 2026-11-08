import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./date-time";

const value = new Date(2026, 10, 8, 14, 30);

describe("date formatters", () => {
  it("writes a day out in Spanish", () => {
    expect(formatDate(value)).toBe("8 de noviembre de 2026");
  });

  it("adds the time to the day", () => {
    expect(formatDateTime(value)).toContain("8 de noviembre de 2026");
    expect(formatDateTime(value)).toContain("14:30");
  });
});
