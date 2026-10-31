import "reflect-metadata";
import { PATH_METADATA } from "@nestjs/common/constants.js";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { IS_PUBLIC_KEY } from "../../../identity/presentation/decorators/public.decorator.js";
import type { GetProductDetailUseCase } from "../../application/use-cases/get-product-detail.use-case.js";
import type { ListFeaturedProductsUseCase } from "../../application/use-cases/list-featured-products.use-case.js";
import type { ListNewProductsUseCase } from "../../application/use-cases/list-new-products.use-case.js";
import type { SearchCatalogUseCase } from "../../application/use-cases/search-catalog.use-case.js";
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
      page: 2,
      limit: 10,
    });
    await controller.findOne("cuaderno-a4");

    expect(search.execute).toHaveBeenCalledExactlyOnceWith({
      categorySlug: "cuadernos",
      q: "rayado",
      isFeatured: true,
      isNew: false,
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
    ["q", "a".repeat(101)],
  ])("refuses %s %o", async (field, value) => {
    expect((await check({ [field]: value })).fields).toEqual([field]);
  });
});
