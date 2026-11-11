import { describe, expect, it } from "vitest";

import { categoryState } from "./category-state";

describe("categoryState", () => {
  it("is active for a category that is shown", () => {
    expect(categoryState({ deletedAt: null, isActive: true })).toBe("active");
  });

  it("is inactive for one that is hidden", () => {
    expect(categoryState({ deletedAt: null, isActive: false })).toBe("inactive");
  });

  it("is deleted whatever the active flag says", () => {
    expect(categoryState({ deletedAt: new Date(), isActive: true })).toBe("deleted");
    expect(categoryState({ deletedAt: new Date(), isActive: false })).toBe("deleted");
  });
});
