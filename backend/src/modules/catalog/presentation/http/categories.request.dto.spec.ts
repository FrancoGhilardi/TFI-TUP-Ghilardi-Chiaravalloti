// Loaded by Nest in the app; @Type needs it to convert the query string values.
import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RecordStatusFilter, SortDirection } from "../../../../shared/application/pagination.js";
import { CategorySortField } from "../../application/dto/list-admin-categories.query.js";
import { CreateCategoryRequestDto } from "./create-category.request.dto.js";
import { ListAdminCategoriesRequestDto } from "./list-admin-categories.request.dto.js";
import { UpdateCategoryRequestDto } from "./update-category.request.dto.js";

const ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";

async function check<T extends object>(type: new () => T, body: Record<string, unknown>) {
  const dto = plainToInstance(type, body);
  const errors = await validate(dto);
  return {
    dto,
    messages: Object.fromEntries(
      errors.map((error) => [error.property, Object.values(error.constraints ?? {})]),
    ),
  };
}

describe("ListAdminCategoriesRequestDto", () => {
  it("defaults to the first page of 20, ascending, without filters nor sorting", async () => {
    const { dto, messages } = await check(ListAdminCategoriesRequestDto, {});

    expect(messages).toEqual({});
    expect(dto).toMatchObject({ page: 1, limit: 20, sortDir: SortDirection.ASC });
    expect(dto.sortBy).toBeUndefined();
    expect(dto.status).toBeUndefined();
  });

  it("reads the query string values, taking a blank search as none", async () => {
    const { dto, messages } = await check(ListAdminCategoriesRequestDto, {
      q: "   ",
      parentId: ID,
      status: "DELETED",
      sortBy: "UPDATED_AT",
      sortDir: "DESC",
      page: "2",
      limit: "5",
    });

    expect(messages).toEqual({});
    expect(dto).toMatchObject({
      q: undefined,
      parentId: ID,
      status: RecordStatusFilter.DELETED,
      sortBy: CategorySortField.UPDATED_AT,
      sortDir: SortDirection.DESC,
      page: 2,
      limit: 5,
    });
  });

  it.each([
    ["parentId", "not-a-uuid"],
    ["sortBy", "PRICE"],
    ["status", "GONE"],
    ["page", "0"],
    ["limit", "101"],
    ["q", "a".repeat(101)],
  ])("rejects %s = %o", async (field, value) => {
    const { messages } = await check(ListAdminCategoriesRequestDto, { [field]: value });

    expect(Object.keys(messages)).toEqual([field]);
  });
});

describe("CreateCategoryRequestDto", () => {
  it("accepts a name alone, trimmed", async () => {
    const { dto, messages } = await check(CreateCategoryRequestDto, { name: "  Cuadernos " });

    expect(messages).toEqual({});
    expect(dto.name).toBe("Cuadernos");
  });

  it.each([
    ["name", "   ", "Ingresá el nombre."],
    ["name", null, "Ingresá el nombre."],
    ["description", null, "La descripción tiene que ser un texto."],
    ["parentId", "abc", "Elegí una categoría padre válida."],
    ["parentId", null, "Elegí una categoría padre válida."],
    ["sortOrder", 1.5, "La posición tiene que ser un número entero desde 0."],
    ["isActive", "yes", "Indicá si la categoría está activa."],
  ])("rejects %s = %o with its message", async (field, value, message) => {
    const { messages } = await check(CreateCategoryRequestDto, {
      name: "Cuadernos",
      [field]: value,
    });

    expect(messages[field]).toContain(message);
  });
});

describe("UpdateCategoryRequestDto", () => {
  it("accepts an empty body, a null parent and a blank description", async () => {
    await expect(check(UpdateCategoryRequestDto, {})).resolves.toMatchObject({ messages: {} });
    const { dto, messages } = await check(UpdateCategoryRequestDto, {
      parentId: null,
      description: "",
    });

    expect(messages).toEqual({});
    expect(dto).toMatchObject({ parentId: null, description: "" });
  });

  it.each([
    ["name", null],
    ["name", " "],
    ["description", null],
    ["parentId", "abc"],
    ["sortOrder", null],
    ["isActive", null],
  ])("rejects %s = %o", async (field, value) => {
    const { messages } = await check(UpdateCategoryRequestDto, { [field]: value });

    expect(Object.keys(messages)).toEqual([field]);
  });
});
