import { describe, expect, it } from "vitest";

import type { AdminCategoryRow } from "./admin-category";
import { categoryFormSchema, EMPTY_CATEGORY_FORM, initialValuesOf } from "./category-form";
import type { CategoryFormValues } from "./category-form";

const valid = (overrides: Partial<CategoryFormValues> = {}): CategoryFormValues => ({
  ...EMPTY_CATEGORY_FORM,
  name: "Librería",
  ...overrides,
});

const issues = (values: CategoryFormValues) => {
  const result = categoryFormSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path.join("."), issue.message]);
};

describe("categoryFormSchema", () => {
  it("accepts a complete category", () => {
    expect(issues(valid())).toEqual([]);
  });

  it.each(["", "   "])("asks for the name when it is %j", (name) => {
    expect(issues(valid({ name }))).toEqual([["name", "Escribí el nombre."]]);
  });

  it("takes a name of 100 characters and refuses 101, counting an accented letter once", () => {
    expect(issues(valid({ name: "á".repeat(100) }))).toEqual([]);
    expect(issues(valid({ name: "á".repeat(101) }))).toEqual([
      ["name", "El nombre puede tener hasta 100 caracteres."],
    ]);
  });

  it("takes a description of 2000 characters and refuses more", () => {
    expect(issues(valid({ description: "a".repeat(2000) }))).toEqual([]);
    expect(issues(valid({ description: "a".repeat(2001) }))).toEqual([
      ["description", "La descripción puede tener hasta 2000 caracteres."],
    ]);
  });

  it.each(["", "-1", "1.5", "abc", "2147483648"])("refuses the position %j", (sortOrder) => {
    expect(issues(valid({ sortOrder }))).toEqual([
      ["sortOrder", "Escribí la posición como un número entero, 0 o más."],
    ]);
  });

  it.each(["0", "7", "2147483647"])("accepts the position %s", (sortOrder) => {
    expect(issues(valid({ sortOrder }))).toEqual([]);
  });

  it("reports every problem at once", () => {
    expect(issues(valid({ name: "", sortOrder: "x" })).map(([path]) => path)).toEqual([
      "name",
      "sortOrder",
    ]);
  });

  it("does not look at the parent: whether it is a valid choice is for the list of options", () => {
    expect(issues(valid({ parentId: "cualquiera" }))).toEqual([]);
  });
});

describe("initialValuesOf", () => {
  const row: AdminCategoryRow = {
    id: "c1",
    name: "Cuadernos",
    slug: "cuadernos",
    description: null,
    parent: { id: "c0", name: "Librería", slug: "libreria" },
    sortOrder: 3,
    isActive: false,
    depth: 1,
    productCount: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it("shows each value the way the fields take it", () => {
    expect(initialValuesOf(row)).toEqual({
      name: "Cuadernos",
      description: "",
      parentId: "c0",
      sortOrder: "3",
      isActive: false,
    });
  });

  it("leaves the parent empty for a root category", () => {
    expect(initialValuesOf({ ...row, parent: null }).parentId).toBe("");
  });

  it("passes the form's own rules when nothing was touched", () => {
    expect(issues(initialValuesOf(row))).toEqual([]);
  });
});
