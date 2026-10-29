import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListAdminProductsRequestDto } from "./list-admin-products.request.dto.js";

const ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";

async function check(query: Record<string, unknown>) {
  const dto = plainToInstance(ListAdminProductsRequestDto, query);
  const errors = await validate(dto);
  return { dto, fields: errors.map((error) => error.property) };
}

describe("ListAdminProductsRequestDto", () => {
  it("defaults to the first page of 20, without filters nor an order", async () => {
    const { dto, fields } = await check({});

    expect(fields).toEqual([]);
    expect(dto).toMatchObject({ page: 1, limit: 20 });
    expect(dto.sortBy).toBeUndefined();
    expect(dto.sortDir).toBeUndefined();
  });

  it("takes a cleared stock box as no filter, never as 0", async () => {
    const { dto, fields } = await check({ maxStock: "" });

    expect(fields).toEqual([]);
    expect(dto.maxStock).toBeUndefined();
  });

  it("reads the query string values", async () => {
    const { dto, fields } = await check({
      q: "  cuad ",
      categoryId: ID.toUpperCase(),
      status: "DELETED",
      isFeatured: "true",
      isOnSale: "false",
      isNew: "true",
      maxStock: "3",
      sortBy: "PRICE",
      sortDir: "DESC",
      page: "2",
      limit: "100",
    });

    expect(fields).toEqual([]);
    expect(dto).toMatchObject({
      q: "cuad",
      categoryId: ID,
      isFeatured: true,
      isOnSale: false,
      isNew: true,
      maxStock: 3,
    });
  });

  it("takes a blank search as none", async () => {
    expect((await check({ q: "   " })).dto.q).toBeUndefined();
  });

  it.each([
    ["q", "a".repeat(101)],
    ["categoryId", "cuadernos"],
    ["status", "GONE"],
    ["isFeatured", "yes"],
    ["isOnSale", "1"],
    ["maxStock", "-1"],
    ["maxStock", "2.5"],
    ["maxStock", "cinco"],
    ["sortBy", "NAME"],
    ["sortDir", "UP"],
    ["limit", "101"],
  ])("refuses %s %o", async (field, value) => {
    expect((await check({ [field]: value })).fields).toEqual([field]);
  });
});
