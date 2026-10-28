import { Clock } from "../../../../shared/application/clock.js";
import type { CategorySummaryResult } from "../dto/admin-category.result.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import { CatalogQueries } from "../ports/catalog-queries.js";
import { CategoryQueries } from "../ports/category-queries.js";
import { CatalogSettings } from "../settings/catalog-settings.js";
import { GlobalSearchUseCase } from "./global-search.use-case.js";

const NOW = new Date("2026-10-28T12:00:00.000Z");

const NOTEBOOK = { id: "product-1" } as ProductCardResult;
const NOTEBOOKS: CategorySummaryResult = { id: "cat-1", name: "Cuadernos", slug: "cuadernos" };

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class StubCatalogQueries extends CatalogQueries {
  readonly calls: unknown[][] = [];

  searchCards(
    words: readonly string[],
    text: string,
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]> {
    this.calls.push([words, text, limit, now]);
    return Promise.resolve([NOTEBOOK]);
  }

  findPage(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findFeatured(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findNew(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findPageBySlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findManualRelated(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findByPrimaryCategory(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

class StubCategoryQueries extends CategoryQueries {
  readonly calls: unknown[][] = [];

  searchVisible(
    words: readonly string[],
    text: string,
    limit: number,
  ): Promise<CategorySummaryResult[]> {
    this.calls.push([words, text, limit]);
    return Promise.resolve([NOTEBOOKS]);
  }

  findVisibleRows(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findAdminPage(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findAdminById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

function setUp() {
  const catalog = new StubCatalogQueries();
  const categories = new StubCategoryQueries();
  return {
    catalog,
    categories,
    search: new GlobalSearchUseCase(catalog, categories, new CatalogSettings(), new FixedClock()),
  };
}

describe("GlobalSearchUseCase", () => {
  it("gives the products and the categories found, each up to the limit", async () => {
    const { catalog, categories, search } = setUp();

    await expect(search.execute({ q: "cuaderno", limit: 7 })).resolves.toEqual({
      products: [NOTEBOOK],
      categories: [NOTEBOOKS],
    });
    expect(catalog.calls).toEqual([[["cuaderno"], "cuaderno", 7, NOW]]);
    expect(categories.calls).toEqual([[["cuaderno"], "cuaderno", 7]]);
  });

  it("looks for each word once, whatever its case, keeping the whole text with single spaces", async () => {
    const { catalog, categories, search } = setUp();

    await search.execute({ q: "  Cuaderno  rayado\tcuaderno A4 ", limit: 5 });

    const words = ["Cuaderno", "rayado", "A4"];
    const text = "Cuaderno rayado cuaderno A4";
    expect(catalog.calls).toEqual([[words, text, 5, NOW]]);
    expect(categories.calls).toEqual([[words, text, 5]]);
  });

  it("takes a word with other accents as the same one", async () => {
    const { catalog, search } = setUp();

    await search.execute({ q: "lápiz LAPIZ negro", limit: 5 });

    expect(catalog.calls).toEqual([[["lápiz", "negro"], "lápiz LAPIZ negro", 5, NOW]]);
  });

  it("leaves out one-letter words and looks for the first 5 distinct ones", async () => {
    const { catalog, search } = setUp();

    await search.execute({ q: "a cuaderno é b uno dos tres cuatro cinco", limit: 5 });

    expect(catalog.calls).toEqual([
      [
        ["cuaderno", "uno", "dos", "tres", "cuatro"],
        "a cuaderno é b uno dos tres cuatro cinco",
        5,
        NOW,
      ],
    ]);
  });

  it("finds nothing, without reading, when every word has one letter", async () => {
    const { catalog, categories, search } = setUp();

    await expect(search.execute({ q: "a b", limit: 5 })).resolves.toEqual({
      products: [],
      categories: [],
    });
    expect(catalog.calls).toEqual([]);
    expect(categories.calls).toEqual([]);
  });
});
