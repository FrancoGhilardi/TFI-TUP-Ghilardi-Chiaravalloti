import { describe, expect, it } from "vitest";

import { canOpenPanelPath } from "./panel-access";

describe("canOpenPanelPath", () => {
  it.each(["/admin/usuarios", "/admin/usuarios/nuevo", "/admin/usuarios/u1/editar"])(
    "lets an admin open %s and keeps a seller out",
    (pathname) => {
      expect(canOpenPanelPath("ADMIN", pathname)).toBe(true);
      expect(canOpenPanelPath("SELLER", pathname)).toBe(false);
    },
  );

  it.each([
    "/admin/inicio",
    "/admin/productos",
    "/admin/categorias",
    "/admin/mi-cuenta",
    "/admin/cambiar-contrasena",
  ])("lets both roles open %s", (pathname) => {
    expect(canOpenPanelPath("ADMIN", pathname)).toBe(true);
    expect(canOpenPanelPath("SELLER", pathname)).toBe(true);
  });

  it("does not mistake a path that only starts with the same letters for the section", () => {
    expect(canOpenPanelPath("SELLER", "/admin/usuarios-viejos")).toBe(true);
  });
});
