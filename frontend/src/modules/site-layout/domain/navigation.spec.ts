import { describe, expect, it } from "vitest";

import { categoryHref, isActivePath } from "./navigation";

describe("isActivePath", () => {
  it.each([
    ["/", "/", true],
    ["/productos", "/", false],
    ["/productos", "/productos", true],
    ["/productos/cuaderno-a4", "/productos", true],
    ["/productos-usados", "/productos", false],
    ["/sobre-nosotros", "/sobre-nosotros", true],
    ["/", "/productos", false],
  ])("on %s, %s is active: %s", (pathname, href, active) => {
    expect(isActivePath(pathname, href)).toBe(active);
  });
});

describe("categoryHref", () => {
  it("filters the catalog by the category slug", () => {
    expect(categoryHref("arte-y-pintura")).toBe("/productos?categoria=arte-y-pintura");
  });
});
