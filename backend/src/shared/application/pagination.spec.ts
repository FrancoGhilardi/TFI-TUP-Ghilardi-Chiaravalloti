import { offsetOf, pageOf } from "./pagination.js";

describe("pagination", () => {
  it("gives the page with its totals", () => {
    expect(pageOf(["a", "b"], 42, { page: 3, limit: 20 })).toEqual({
      items: ["a", "b"],
      page: 3,
      limit: 20,
      totalItems: 42,
      totalPages: 3,
    });
  });

  it.each([
    [0, 0],
    [20, 1],
    [21, 2],
  ])("counts %i items as %i pages of 20", (totalItems, totalPages) => {
    expect(pageOf([], totalItems, { page: 1, limit: 20 }).totalPages).toBe(totalPages);
  });

  it.each([
    [1, 0],
    [2, 20],
    [5, 80],
  ])("skips to page %i by %i rows", (page, offset) => {
    expect(offsetOf({ page, limit: 20 })).toBe(offset);
  });
});
