import { describe, expect, it } from "vitest";

import type { CategoryNode } from "./category";
import { findCategoryPath } from "./category-tree";

const node = (slug: string, children: CategoryNode[] = []): CategoryNode => ({
  id: slug,
  name: slug,
  slug,
  description: null,
  children,
});

const rayados = node("rayados");
const cuadernos = node("cuadernos", [rayados, node("cuadriculados")]);
const escolar = node("escolar", [cuadernos, node("lapices")]);
const arte = node("arte");
const tree = [escolar, arte];

describe("findCategoryPath", () => {
  it("finds a first-level category alone in its trail", () => {
    expect(findCategoryPath(tree, "arte")).toEqual({ trail: [arte], selected: arte });
  });

  it("finds a category at any depth with every category above it", () => {
    expect(findCategoryPath(tree, "rayados")).toEqual({
      trail: [escolar, cuadernos, rayados],
      selected: rayados,
    });
  });

  it("finds nothing for an unknown slug", () => {
    expect(findCategoryPath(tree, "juguetes")).toBeUndefined();
  });
});
