import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { IS_PUBLIC_KEY } from "../../../identity/presentation/decorators/public.decorator.js";
import type { GetProductDetailUseCase } from "../../application/use-cases/get-product-detail.use-case.js";
import type { SearchCatalogUseCase } from "../../application/use-cases/search-catalog.use-case.js";
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
    const controller = new CatalogController(
      search as unknown as SearchCatalogUseCase,
      detail as unknown as GetProductDetailUseCase,
    );
    return { search, detail, controller };
  }

  it("is open to anyone", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CatalogController)).toBe(true);
  });

  it.each(["findAll", "findOne"] as const)("lets %s be cached for 60 seconds", (method) => {
    const handler = Object.getOwnPropertyDescriptor(CatalogController.prototype, method)
      ?.value as object;

    expect(Reflect.getMetadata("__headers__", handler)).toEqual([
      { name: "Cache-Control", value: "public, max-age=60" },
    ]);
  });

  it("passes the listing and the slug to their use cases", async () => {
    const { search, detail, controller } = setUp();

    await controller.findAll({ categorySlug: "cuadernos", page: 2, limit: 10 });
    await controller.findOne("cuaderno-a4");

    expect(search.execute).toHaveBeenCalledExactlyOnceWith({
      categorySlug: "cuadernos",
      page: 2,
      limit: 10,
    });
    expect(detail.execute).toHaveBeenCalledExactlyOnceWith("cuaderno-a4");
  });
});

describe("SearchCatalogRequestDto", () => {
  it("defaults to the first page of 20, without a category", async () => {
    const { dto, fields } = await check({});

    expect(fields).toEqual([]);
    expect(dto).toMatchObject({ page: 1, limit: 20, categorySlug: undefined });
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
    ["limit", "0"],
    ["limit", "51"],
    ["categorySlug", "a".repeat(121)],
  ])("refuses %s %o", async (field, value) => {
    expect((await check({ [field]: value })).fields).toEqual([field]);
  });
});
