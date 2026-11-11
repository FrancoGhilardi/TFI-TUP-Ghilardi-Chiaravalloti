import { describe, expect, it } from "vitest";

import { parsePage, readParam } from "./list-query";

describe("parsePage", () => {
  it.each([
    ["1", 1],
    ["7", 7],
    ["500", 500],
  ])("takes %s as page %i", (value, page) => {
    expect(parsePage(value)).toBe(page);
  });

  it.each([undefined, "", "0", "-1", "501", "1.5", "abc"])(
    "takes %s as the first page",
    (value) => {
      expect(parsePage(value)).toBe(1);
    },
  );
});

describe("readParam", () => {
  const params = new URLSearchParams("q=%20libros%20&blank=%20%20&empty=");

  it("trims what is there", () => {
    expect(readParam(params, "q")).toBe("libros");
  });

  it.each(["blank", "empty", "missing"])("is undefined for %s", (name) => {
    expect(readParam(params, name)).toBeUndefined();
  });
});
