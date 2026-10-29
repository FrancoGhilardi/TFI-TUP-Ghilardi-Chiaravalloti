import { Clock } from "../../../../shared/application/clock.js";
import type { Page } from "../../../../shared/application/pagination.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import type { ProductPage } from "../dto/product-detail.result.js";
import type { CatalogPageQuery } from "../dto/catalog-page.query.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { CatalogQueries } from "../ports/catalog-queries.js";
import { CatalogSettings } from "../settings/catalog-settings.js";
import { GetProductDetailUseCase } from "./get-product-detail.use-case.js";
import { ListFeaturedProductsUseCase } from "./list-featured-products.use-case.js";
import { ListNewProductsUseCase } from "./list-new-products.use-case.js";
import { SearchCatalogUseCase } from "./search-catalog.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");

const card = (id: string) => ({ id }) as ProductCardResult;

const CATEGORY = { id: "cat-1", name: "Cuadernos", slug: "cuadernos" };

const PAGE: ProductPage = {
  id: "product-1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  description: null,
  price: "1000.00",
  salePrice: null,
  isOnSale: false,
  saleEndsAt: null,
  stock: 3,
  isFeatured: false,
  isNew: false,
  images: [],
  primaryCategory: CATEGORY,
  categories: [CATEGORY],
};

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class StubQueries extends CatalogQueries {
  readonly calls: unknown[][] = [];
  page: ProductPage | null = PAGE;
  manual: ProductCardResult[] = [];
  sameCategory: ProductCardResult[] = [];

  findPage(query: CatalogPageQuery, now: Date): Promise<Page<ProductCardResult>> {
    this.calls.push(["page", query, now]);
    return Promise.resolve({ items: [], page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  }

  findFeatured(limit: number, now: Date): Promise<ProductCardResult[]> {
    this.calls.push(["featured", limit, now]);
    return Promise.resolve([card("featured-1")]);
  }

  findNew(limit: number, now: Date): Promise<ProductCardResult[]> {
    this.calls.push(["new", limit, now]);
    return Promise.resolve([card("new-1")]);
  }

  findPageBySlug(slug: string, now: Date): Promise<ProductPage | null> {
    this.calls.push(["slug", slug, now]);
    return Promise.resolve(this.page);
  }

  findManualRelated(productId: string, limit: number, now: Date): Promise<ProductCardResult[]> {
    this.calls.push(["manual", productId, limit, now]);
    return Promise.resolve(this.manual.slice(0, limit));
  }

  findByPrimaryCategory(
    categoryId: string,
    excludeIds: string[],
    limit: number,
    now: Date,
  ): Promise<ProductCardResult[]> {
    this.calls.push(["category", categoryId, excludeIds, limit, now]);
    return Promise.resolve(this.sameCategory.slice(0, limit));
  }

  searchCards(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

function setUp() {
  const queries = new StubQueries();
  const clock = new FixedClock();
  return {
    queries,
    search: new SearchCatalogUseCase(queries, new CatalogSettings(), clock),
    featured: new ListFeaturedProductsUseCase(queries, new CatalogSettings(), clock),
    fresh: new ListNewProductsUseCase(queries, new CatalogSettings(), clock),
    detail: new GetProductDetailUseCase(queries, new CatalogSettings(), clock),
  };
}

describe("SearchCatalogUseCase", () => {
  it("reads the page as of now", async () => {
    const { queries, search } = setUp();
    const query = { categorySlug: "cuadernos", page: 2, limit: 10 };

    await search.execute(query);

    expect(queries.calls).toEqual([["page", query, NOW]]);
  });

  it("looks for the words of the text, as the search box does", async () => {
    const { queries, search } = setUp();

    await search.execute({ q: " Lápiz a lapiz NEGRO ", page: 1, limit: 20 });

    expect(queries.calls).toEqual([
      ["page", { page: 1, limit: 20, words: ["Lápiz", "NEGRO"] }, NOW],
    ]);
  });

  it("finds nothing, without reading, for a text of one-letter words", async () => {
    const { queries, search } = setUp();

    await expect(search.execute({ q: "a b", page: 2, limit: 10 })).resolves.toEqual({
      items: [],
      page: 2,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
    });
    expect(queries.calls).toEqual([]);
  });
});

describe("ListFeaturedProductsUseCase and ListNewProductsUseCase", () => {
  it("read five of each as of now", async () => {
    const { queries, featured, fresh } = setUp();

    await expect(featured.execute()).resolves.toEqual([card("featured-1")]);
    await expect(fresh.execute()).resolves.toEqual([card("new-1")]);

    expect(queries.calls).toEqual([
      ["featured", 5, NOW],
      ["new", 5, NOW],
    ]);
  });
});

describe("GetProductDetailUseCase", () => {
  it("gives the page with the related products set by hand, without asking for more when they are enough", async () => {
    const { queries, detail } = setUp();
    queries.manual = ["a", "b", "c", "d", "e"].map(card);

    const result = await detail.execute("cuaderno-a4");

    expect(result.relatedProducts.map((related) => related.id)).toEqual(["a", "b", "c", "d"]);
    expect(result).toEqual({ ...PAGE, relatedProducts: result.relatedProducts });
    expect(queries.calls.map((call) => call[0])).toEqual(["slug", "manual"]);
  });

  it("completes them with others of the same primary category, leaving out those already in", async () => {
    const { queries, detail } = setUp();
    queries.manual = [card("a")];
    queries.sameCategory = ["x", "y", "z", "w"].map(card);

    const result = await detail.execute("cuaderno-a4");

    expect(result.relatedProducts.map((related) => related.id)).toEqual(["a", "x", "y", "z"]);
    expect(queries.calls.at(-1)).toEqual(["category", "cat-1", ["product-1", "a"], 3, NOW]);
  });

  it("does not complete them while the primary category is hidden", async () => {
    const { queries, detail } = setUp();
    queries.page = { ...PAGE, primaryCategory: null };
    queries.manual = [card("a")];
    queries.sameCategory = [card("x")];

    const result = await detail.execute("cuaderno-a4");

    expect(result.relatedProducts.map((related) => related.id)).toEqual(["a"]);
    expect(queries.calls.map((call) => call[0])).toEqual(["slug", "manual"]);
  });

  it("answers 404 for a product the store does not show", async () => {
    const { queries, detail } = setUp();
    queries.page = null;

    await expect(detail.execute("cuaderno-a4")).rejects.toThrow(ProductNotFoundError);
  });

  it.each(["Cuaderno", "cuaderno--a4", "a".repeat(221), "lápiz"])(
    "answers 404 for %o, which no slug can be, without reading",
    async (slug) => {
      const { queries, detail } = setUp();

      await expect(detail.execute(slug)).rejects.toThrow(ProductNotFoundError);
      expect(queries.calls).toEqual([]);
    },
  );
});
