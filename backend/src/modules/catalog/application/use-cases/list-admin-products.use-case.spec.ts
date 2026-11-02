import { Clock } from "../../../../shared/application/clock.js";
import { type Page, SortDirection } from "../../../../shared/application/pagination.js";
import type { AdminProductListItemResult } from "../dto/admin-product-list-item.result.js";
import type { ListAdminProductsQuery } from "../dto/list-admin-products.query.js";
import { AdminProductQueries } from "../ports/admin-product-queries.js";
import { ListAdminProductsUseCase } from "./list-admin-products.use-case.js";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const PAGE: Page<AdminProductListItemResult> = {
  items: [],
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class RecordingQueries extends AdminProductQueries {
  readonly calls: [ListAdminProductsQuery, Date][] = [];

  findPage(query: ListAdminProductsQuery, now: Date): Promise<Page<AdminProductListItemResult>> {
    this.calls.push([query, now]);
    return Promise.resolve(PAGE);
  }

  findById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findImageById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findImagesByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

describe("ListAdminProductsUseCase", () => {
  it("reads the page asked for as of now", async () => {
    const queries = new RecordingQueries();
    const query = { page: 2, limit: 10, q: "cuad", isOnSale: true, sortDir: SortDirection.ASC };

    await expect(
      new ListAdminProductsUseCase(queries, new FixedClock()).execute(query),
    ).resolves.toBe(PAGE);
    expect(queries.calls).toEqual([[query, NOW]]);
  });
});
