import { describe, expect, it } from "vitest";

import { EMPTY_CATEGORY_FORM, type CategoryFormValues } from "./category-form";
import { hasChanges, toCreateRequest, toUpdateRequest } from "./category-request";

const base = (overrides: Partial<CategoryFormValues> = {}): CategoryFormValues => ({
  ...EMPTY_CATEGORY_FORM,
  name: "Cuadernos",
  ...overrides,
});

describe("toCreateRequest", () => {
  it("builds the minimum, with no parent and no description", () => {
    expect(toCreateRequest(base())).toEqual({ name: "Cuadernos", sortOrder: 0, isActive: true });
  });

  it("trims the name and the description and leaves a blank description out", () => {
    expect(
      toCreateRequest(base({ name: "  Cuadernos ", description: "  Escolares  " })),
    ).toMatchObject({
      name: "Cuadernos",
      description: "Escolares",
    });
    expect(toCreateRequest(base({ description: "   " }))).not.toHaveProperty("description");
  });

  it("sends the parent in lowercase, the position as a number and the state", () => {
    expect(toCreateRequest(base({ parentId: "ABC", sortOrder: "4", isActive: false }))).toEqual({
      name: "Cuadernos",
      parentId: "abc",
      sortOrder: 4,
      isActive: false,
    });
  });
});

describe("toUpdateRequest", () => {
  const initial = base({ description: "Escolares", parentId: "p1", sortOrder: "2" });
  const update = (overrides: Partial<CategoryFormValues>) =>
    toUpdateRequest({ ...initial, ...overrides }, initial);

  it("is empty when nothing changed, and says so", () => {
    expect(update({})).toEqual({});
    expect(hasChanges(initial, initial)).toBe(false);
  });

  it("ignores changes that only reword the same value", () => {
    expect(update({ name: " Cuadernos ", sortOrder: "02", parentId: "P1" })).toEqual({});
  });

  it("sends each field on its own", () => {
    expect(update({ name: "Otro" })).toEqual({ name: "Otro" });
    expect(update({ sortOrder: "5" })).toEqual({ sortOrder: 5 });
    expect(update({ isActive: false })).toEqual({ isActive: false });
    expect(update({ parentId: "p2" })).toEqual({ parentId: "p2" });
  });

  it("moves it to the root with null when the parent is taken away", () => {
    expect(update({ parentId: "" })).toEqual({ parentId: null });
  });

  it("gives it a parent when it had none", () => {
    expect(toUpdateRequest(base({ parentId: "p9" }), base())).toEqual({ parentId: "p9" });
  });

  it("sends an emptied description as an empty text, never as null", () => {
    expect(update({ description: "" })).toEqual({ description: "" });
    expect(update({ description: "   " })).toEqual({ description: "" });
  });

  it("never sends null for anything but the parent", () => {
    const request = update({ name: "Otro", description: "", sortOrder: "0", isActive: false });

    expect(Object.entries(request).filter(([, value]) => value === null)).toEqual([]);
  });

  it("reports changes", () => {
    expect(hasChanges({ ...initial, name: "Otro" }, initial)).toBe(true);
  });
});
