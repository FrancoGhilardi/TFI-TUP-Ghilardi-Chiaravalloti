import { describe, expect, it } from "vitest";

import { nextPrimary, toggleCategory } from "./category-selection";

describe("nextPrimary", () => {
  it("keeps the primary while it is still chosen", () => {
    expect(nextPrimary(["a", "b"], "b")).toBe("b");
  });

  it("takes the first of those left when the primary is gone", () => {
    expect(nextPrimary(["a", "b"], "c")).toBe("a");
  });

  it("is empty when nothing is chosen", () => {
    expect(nextPrimary([], "a")).toBe("");
  });
});

describe("toggleCategory", () => {
  it("makes the first category chosen the primary one", () => {
    expect(toggleCategory({ categoryIds: [], primaryCategoryId: "" }, "a")).toEqual({
      categoryIds: ["a"],
      primaryCategoryId: "a",
    });
  });

  it("keeps the primary when another is added", () => {
    expect(toggleCategory({ categoryIds: ["a"], primaryCategoryId: "a" }, "b")).toEqual({
      categoryIds: ["a", "b"],
      primaryCategoryId: "a",
    });
  });

  it("promotes the first remaining when the primary is removed", () => {
    expect(toggleCategory({ categoryIds: ["a", "b", "c"], primaryCategoryId: "a" }, "a")).toEqual({
      categoryIds: ["b", "c"],
      primaryCategoryId: "b",
    });
  });

  it("keeps the primary when another is removed", () => {
    expect(toggleCategory({ categoryIds: ["a", "b"], primaryCategoryId: "a" }, "b")).toEqual({
      categoryIds: ["a"],
      primaryCategoryId: "a",
    });
  });

  it("leaves nothing chosen when the last one is removed", () => {
    expect(toggleCategory({ categoryIds: ["a"], primaryCategoryId: "a" }, "a")).toEqual({
      categoryIds: [],
      primaryCategoryId: "",
    });
  });
});
