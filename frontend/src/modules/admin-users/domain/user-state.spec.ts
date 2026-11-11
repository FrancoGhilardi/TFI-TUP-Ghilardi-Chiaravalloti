import { describe, expect, it } from "vitest";

import { userState } from "./user-state";

describe("userState", () => {
  it("is active or inactive for a current user", () => {
    expect(userState({ deletedAt: null, isActive: true })).toBe("active");
    expect(userState({ deletedAt: null, isActive: false })).toBe("inactive");
  });

  it("is deleted whatever its active flag says", () => {
    const deletedAt = new Date("2026-11-01T00:00:00Z");

    expect(userState({ deletedAt, isActive: true })).toBe("deleted");
    expect(userState({ deletedAt, isActive: false })).toBe("deleted");
  });
});
