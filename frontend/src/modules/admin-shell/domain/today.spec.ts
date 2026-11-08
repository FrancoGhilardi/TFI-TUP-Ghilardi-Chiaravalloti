import { describe, expect, it } from "vitest";

import { formatToday } from "./today";

describe("formatToday", () => {
  it("writes the weekday, the day and the month in Spanish", () => {
    const text = formatToday(new Date(2026, 10, 8, 12));

    expect(text).toContain("domingo");
    expect(text).toContain("8");
    expect(text).toContain("noviembre");
  });
});
