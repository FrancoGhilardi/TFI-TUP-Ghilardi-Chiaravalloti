import { describe, expect, it } from "vitest";

import { categoryOptionOf } from "./category-option";

describe("categoryOptionOf", () => {
  it("lists a root category by its name", () => {
    expect(categoryOptionOf({ id: "c1", name: "Librería", depth: 0, isActive: true })).toEqual({
      id: "c1",
      label: "Librería",
      name: "Librería",
      depth: 0,
      isActive: true,
    });
  });

  it("indents a category by its level", () => {
    expect(categoryOptionOf({ id: "c2", name: "Cuadernos", depth: 2, isActive: true }).label).toBe(
      "\u2003\u2003Cuadernos",
    );
  });

  it("marks a category that is hidden", () => {
    const option = categoryOptionOf({ id: "c3", name: "Oferta", depth: 1, isActive: false });

    expect(option.label).toBe("\u2003Oferta (inactiva)");
    expect(option).toMatchObject({ name: "Oferta", depth: 1, isActive: false });
  });
});
