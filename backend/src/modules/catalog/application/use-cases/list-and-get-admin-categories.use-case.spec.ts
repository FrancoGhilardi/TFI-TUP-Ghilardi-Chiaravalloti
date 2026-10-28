import { type Page, SortDirection } from "../../../../shared/application/pagination.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import type { ListAdminCategoriesQuery } from "../dto/list-admin-categories.query.js";
import { CategoryNotFoundError } from "../errors/category-not-found-error.js";
import { CategoryQueries } from "../ports/category-queries.js";
import { GetAdminCategoryUseCase } from "./get-admin-category.use-case.js";
import { ListAdminCategoriesUseCase } from "./list-admin-categories.use-case.js";

const NOTEBOOKS: AdminCategoryResult = {
  id: "cat-1",
  name: "Cuadernos",
  slug: "cuadernos",
  description: null,
  parent: null,
  sortOrder: 0,
  isActive: true,
  depth: 0,
  productCount: 3,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null,
};

class FakeCategoryQueries extends CategoryQueries {
  readonly asked: ListAdminCategoriesQuery[] = [];

  findAdminPage(query: ListAdminCategoriesQuery): Promise<Page<AdminCategoryResult>> {
    this.asked.push(query);
    return Promise.resolve({
      items: [NOTEBOOKS],
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });
  }

  findAdminById(id: string): Promise<AdminCategoryResult | null> {
    return Promise.resolve(id === NOTEBOOKS.id ? NOTEBOOKS : null);
  }

  findVisibleRows(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  searchVisible(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

describe("ListAdminCategoriesUseCase", () => {
  it("returns the page the queries give for the same query", async () => {
    const queries = new FakeCategoryQueries();
    const query = { page: 1, limit: 20, sortDir: SortDirection.ASC, q: "cuad" };

    const page = await new ListAdminCategoriesUseCase(queries).execute(query);

    expect(queries.asked).toEqual([query]);
    expect(page.items).toEqual([NOTEBOOKS]);
  });
});

describe("GetAdminCategoryUseCase", () => {
  it("returns the category", async () => {
    await expect(
      new GetAdminCategoryUseCase(new FakeCategoryQueries()).execute("cat-1"),
    ).resolves.toBe(NOTEBOOKS);
  });

  it("fails with CATEGORY_NOT_FOUND for an unknown id", async () => {
    await expect(
      new GetAdminCategoryUseCase(new FakeCategoryQueries()).execute("nobody"),
    ).rejects.toThrow(CategoryNotFoundError);
  });
});
