import { describe, expect, it } from "vitest";

import { firstNameOf, initialsOf } from "./person-name";
import { isActiveItem, menuFor, pageTitle } from "./menu";

const hrefs = (role: "ADMIN" | "SELLER") =>
  menuFor(role).flatMap(({ items }) => items.map(({ href }) => href));

describe("menuFor", () => {
  it("shows an admin every section, the administration group included", () => {
    expect(menuFor("ADMIN").map(({ group }) => group)).toEqual(["catalog", "admin", "account"]);
    expect(hrefs("ADMIN")).toEqual([
      "/admin/inicio",
      "/admin/productos",
      "/admin/categorias",
      "/admin/usuarios",
      "/admin/mi-cuenta",
      "/",
    ]);
  });

  it("hides users, and the whole administration group, from a seller", () => {
    expect(menuFor("SELLER").map(({ group }) => group)).toEqual(["catalog", "account"]);
    expect(hrefs("SELLER")).not.toContain("/admin/usuarios");
  });

  it("marks only the store link as leaving the panel", () => {
    const external = menuFor("ADMIN")
      .flatMap(({ items }) => items)
      .filter(({ external }) => external);

    expect(external.map(({ href }) => href)).toEqual(["/"]);
  });
});

describe("isActiveItem", () => {
  it("matches the screen itself and what is inside it", () => {
    expect(isActiveItem("/admin/productos", "/admin/productos")).toBe(true);
    expect(isActiveItem("/admin/productos/nuevo", "/admin/productos")).toBe(true);
  });

  it("does not match a section that only starts with the same letters", () => {
    expect(isActiveItem("/admin/productos-viejos", "/admin/productos")).toBe(false);
    expect(isActiveItem("/admin/inicio", "/admin/productos")).toBe(false);
  });
});

describe("pageTitle", () => {
  it("names the screen by its menu entry, also inside it", () => {
    expect(pageTitle("/admin/categorias")).toBe("Categorías");
    expect(pageTitle("/admin/productos/nuevo")).toBe("Productos");
  });

  it("falls back to the panel for a screen without entry", () => {
    expect(pageTitle("/admin/otra")).toBe("Panel");
  });
});

describe("initialsOf", () => {
  it.each([
    ["Marta Gómez", "MG"],
    ["marta", "M"],
    ["  Ana  María  Pérez ", "AM"],
    ["", ""],
    ["😀 Ana", "😀A"],
  ])("takes %j to %j", (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});

describe("firstNameOf", () => {
  it.each([
    ["Marta Gómez", "Marta"],
    ["  ana  maría ", "ana"],
    ["Cecilia", "Cecilia"],
  ])("takes %j to %j", (name, expected) => {
    expect(firstNameOf(name)).toBe(expected);
  });
});
