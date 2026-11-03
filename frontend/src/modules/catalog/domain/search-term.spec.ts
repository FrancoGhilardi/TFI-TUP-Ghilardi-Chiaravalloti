import { describe, expect, it } from "vitest";

import { hasSuggestions, searchResultsHref } from "./search-term";

describe("searchResultsHref", () => {
  it("goes to the catalog with the term alone, encoded", () => {
    expect(searchResultsHref("lápiz & goma")).toBe("/productos?q=l%C3%A1piz+%26+goma");
  });
});

describe("hasSuggestions", () => {
  it("is true with products or with categories, false with neither", () => {
    const category = { id: "c1", name: "Cuadernos", slug: "cuadernos" };

    expect(hasSuggestions({ products: [], categories: [] })).toBe(false);
    expect(hasSuggestions({ products: [], categories: [category] })).toBe(true);
  });
});
