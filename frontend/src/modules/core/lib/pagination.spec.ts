import { describe, expect, it } from "vitest";

import { paginationItems } from "./pagination";

/** Pages as numbers and gaps as "…", to read the sequences at a glance. */
const shape = (current: number, total: number) =>
  paginationItems(current, total).map((item) => (item.type === "page" ? item.page : "…"));

describe("paginationItems", () => {
  it("shows nothing for a single page or none", () => {
    expect(shape(1, 1)).toEqual([]);
    expect(shape(1, 0)).toEqual([]);
  });

  it.each([
    [1, 2, [1, 2]],
    [3, 5, [1, 2, 3, 4, 5]],
    [1, 20, [1, 2, "…", 20]],
    [5, 20, [1, "…", 4, 5, 6, "…", 20]],
    [4, 20, [1, 2, 3, 4, 5, "…", 20]],
    [3, 20, [1, 2, 3, 4, "…", 20]],
    [18, 20, [1, "…", 17, 18, 19, 20]],
    [20, 20, [1, "…", 19, 20]],
  ])("on page %i of %i shows %j", (current, total, expected) => {
    expect(shape(current, total)).toEqual(expected);
  });

  it("never hides a single page behind a gap", () => {
    expect(shape(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
