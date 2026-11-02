import "reflect-metadata";
import { PATH_METADATA } from "@nestjs/common/constants.js";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { IS_PUBLIC_KEY } from "../../../identity/presentation/decorators/public.decorator.js";
import type { GetProductDetailUseCase } from "../../application/use-cases/get-product-detail.use-case.js";
import type { ListFeaturedProductsUseCase } from "../../application/use-cases/list-featured-products.use-case.js";
import type { ListNewProductsUseCase } from "../../application/use-cases/list-new-products.use-case.js";
import type { SearchCatalogUseCase } from "../../application/use-cases/search-catalog.use-case.js";
import { ProductSort } from "../../application/dto/search-catalog.query.js";
import { RESERVED_PRODUCT_SLUGS } from "../../domain/reserved-slugs.js";
import { CatalogController } from "./catalog.controller.js";
import { SearchCatalogRequestDto } from "./search-catalog.request.dto.js";

async function check(query: Record<string, unknown>) {
  const dto = plainToInstance(SearchCatalogRequestDto, query);
  const errors = await validate(dto);
  return { dto, fields: errors.map((error) => error.property) };
}

describe("CatalogController", () => {
  function setUp() {
    const search = { execute: vi.fn(() => Promise.resolve({})) };
    const detail = { execute: vi.fn(() => Promise.resolve({})) };
    const featured = { execute: vi.fn(() => Promise.resolve([])) };
    const fresh = { execute: vi.fn(() => Promise.resolve([])) };
    const controller = new CatalogController(
      search as unknown as SearchCatalogUseCase,
      detail as unknown as GetProductDetailUseCase,
      featured as unknown as ListFeaturedProductsUseCase,
      fresh as unknown as ListNewProductsUseCase,
    );
    return { search, detail, featured, fresh, controller };
  }

  it("is open to anyone", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CatalogController)).toBe(true);
  });

  it.each(["findAll", "findFeatured", "findNew", "findOne"] as const)(
    "lets %s be cached for 60 seconds",
    (method) => {
      const handler = Object.getOwnPropertyDescriptor(CatalogController.prototype, method)
        ?.value as object;

      expect(Reflect.getMetadata("__headers__", handler)).toEqual([
        { name: "Cache-Control", value: "public, max-age=60" },
      ]);
    },
  );

  it("only adds fixed routes whose path no product can take as its slug", () => {
    const fixed = Object.getOwnPropertyNames(CatalogController.prototype)
      .filter((method) => method !== "constructor")
      .map((method) => {
        const handler = Object.getOwnPropertyDescriptor(CatalogController.prototype, method)
          ?.value as object;
        return Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      })
      .filter((path) => path !== undefined && path !== "/" && !path.startsWith(":"));

    expect(fixed.length).toBeGreaterThan(0);
    expect(RESERVED_PRODUCT_SLUGS).toEqual(expect.arrayContaining(fixed));
  });

  it("passes the listing and the slug to their use cases", async () => {
    const { search, detail, controller } = setUp();

    await controller.findAll({
      categorySlug: "cuadernos",
      q: "rayado",
      isFeatured: true,
      isNew: false,
      isOnSale: true,
      inStock: false,
      minPrice: "10",
      maxPrice: "20.50",
      sort: ProductSort.PRICE_ASC,
      page: 2,
      limit: 10,
    });
    await controller.findOne("cuaderno-a4");

    expect(search.execute).toHaveBeenCalledExactlyOnceWith({
      categorySlug: "cuadernos",
      q: "rayado",
      isFeatured: true,
      isNew: false,
      isOnSale: true,
      inStock: false,
      minPrice: "10",
      maxPrice: "20.50",
      sort: ProductSort.PRICE_ASC,
      page: 2,
      limit: 10,
    });
    expect(detail.execute).toHaveBeenCalledExactlyOnceWith("cuaderno-a4");
  });

  it("serves the featured and new products from their use cases", async () => {
    const { featured, fresh, controller } = setUp();

    await controller.findFeatured();
    await controller.findNew();

    expect(featured.execute).toHaveBeenCalledOnce();
    expect(fresh.execute).toHaveBeenCalledOnce();
  });
});

describe("SearchCatalogRequestDto", () => {
  it("defaults to the first page of 20, without a category", async () => {
    const { dto, fields } = await check({});

    expect(fields).toEqual([]);
    expect(dto).toMatchObject({ page: 1, limit: 20, categorySlug: undefined });
  });

  it("reads the marks as true or false", async () => {
    await expect(check({ isFeatured: "true", isNew: "false" })).resolves.toMatchObject({
      dto: { isFeatured: true, isNew: false },
      fields: [],
    });
  });

  it("reads the sale and the stock as true or false, and the order", async () => {
    await expect(
      check({ isOnSale: "true", inStock: "false", sort: "TITLE_ASC" }),
    ).resolves.toMatchObject({
      dto: { isOnSale: true, inStock: false, sort: ProductSort.TITLE_ASC },
      fields: [],
    });
  });

  it("reads the prices as decimal text, trimmed, and takes an equal range", async () => {
    await expect(check({ minPrice: " 1500 ", maxPrice: "1500.00" })).resolves.toMatchObject({
      dto: { minPrice: "1500", maxPrice: "1500.00" },
      fields: [],
    });
    expect((await check({ minPrice: "  " })).dto.minPrice).toBeUndefined();
  });

  it("refuses a wrong price alone, leaving the range to the use case", async () => {
    expect((await check({ minPrice: "x", maxPrice: "1" })).fields).toEqual(["minPrice"]);
    expect((await check({ minPrice: "20", maxPrice: "10" })).fields).toEqual([]);
  });

  it("reads a search trimmed, and a blank one as none", async () => {
    await expect(check({ q: "  cuaderno rayado " })).resolves.toMatchObject({
      dto: { q: "cuaderno rayado" },
      fields: [],
    });
    expect((await check({ q: "   " })).dto.q).toBeUndefined();
  });

  it("reads the query string values, taking a blank category as none", async () => {
    await expect(check({ page: "3", limit: "50", categorySlug: " cuadernos " })).resolves.toEqual(
      expect.objectContaining({ fields: [] }),
    );
    expect((await check({ categorySlug: "  " })).dto.categorySlug).toBeUndefined();
  });

  it.each([
    ["page", "0"],
    ["page", "uno"],
    ["page", "501"],
    ["limit", "0"],
    ["limit", "51"],
    ["categorySlug", "a".repeat(121)],
    ["q", "a"],
    ["isFeatured", "si"],
    ["isNew", "1"],
    ["isOnSale", "si"],
    ["inStock", "0"],
    ["minPrice", "-1"],
    ["minPrice", "1,50"],
    ["maxPrice", "1.505"],
    ["maxPrice", "12345678901"],
    ["sort", "PRICE"],
    ["sort", ["PRICE_ASC", "NEWEST"]],
    ["q", "a".repeat(101)],
  ])("refuses %s %o", async (field, value) => {
    expect((await check({ [field]: value })).fields).toEqual([field]);
  });
});
