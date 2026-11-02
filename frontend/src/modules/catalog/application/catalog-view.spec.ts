import { describe, expect, it } from "vitest";

import type { Page } from "@/modules/core/http";

import type { ProductCard } from "../domain/product-card";
import { catalogView } from "./catalog-view";

const card = { id: "p1" } as ProductCard;
const page = (overrides: Partial<Page<ProductCard>>): Page<ProductCard> => ({
  items: [card],
  page: 1,
  limit: 20,
  totalItems: 1,
  totalPages: 1,
  ...overrides,
});

describe("catalogView", () => {
  it("shows the error state for a failed read", () => {
    expect(catalogView({ status: "error" })).toEqual({ kind: "error" });
  });

  it("shows the empty state when nothing matches", () => {
    expect(
      catalogView({ status: "ok", page: page({ items: [], totalItems: 0, totalPages: 0 }) }),
    ).toEqual({ kind: "empty" });
  });

  it("tells a page past the last one apart from no results", () => {
    expect(
      catalogView({
        status: "ok",
        page: page({ items: [], page: 9, totalItems: 21, totalPages: 2 }),
      }),
    ).toEqual({ kind: "outOfRange" });
  });

  it("shows the products otherwise", () => {
    const results = page({});

    expect(catalogView({ status: "ok", page: results })).toEqual({
      kind: "results",
      page: results,
    });
  });
});
