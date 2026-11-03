import { describe, expect, it } from "vitest";

import { destinationAfterLogin, safeNextPath } from "./post-login-destination";
import type { AuthenticatedUser } from "./user";

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: "u1",
  email: "marta@libreriamisueno.com.ar",
  name: "Marta",
  role: "ADMIN",
  mustChangePassword: false,
  ...overrides,
});

describe("safeNextPath", () => {
  it.each([
    ["/admin/productos", "/admin/productos"],
    ["/admin/productos?q=lapiz&pagina=2", "/admin/productos?q=lapiz&pagina=2"],
  ])("keeps a path inside the panel: %s", (raw, expected) => {
    expect(safeNextPath(raw)).toBe(expected);
  });

  it("drops the closing slash and the fragment", () => {
    expect(safeNextPath("/admin/productos/123/")).toBe("/admin/productos/123");
    expect(safeNextPath("/admin/productos#abajo")).toBe("/admin/productos");
  });

  it.each([
    undefined,
    "",
    "productos",
    "https://evil.com/admin/productos",
    "//evil.com/admin/productos",
    "/\\evil.com",
    "/\\/evil.com/admin",
    "/admin/../tienda",
    "/administrador",
    "/productos",
    "javascript:alert(1)",
  ])("drops an address that is not a path inside the panel: %j", (raw) => {
    expect(safeNextPath(raw)).toBeUndefined();
  });

  it.each([
    "/admin",
    "/admin/",
    "/admin/login",
    "/admin/login/",
    "/admin/olvide-mi-contrasena",
    "/admin/cambiar-contrasena",
    "/admin/cambiar-contrasena/",
  ])("drops an auth screen or the bare panel: %s", (raw) => {
    expect(safeNextPath(raw)).toBeUndefined();
  });
});

describe("destinationAfterLogin", () => {
  it("sends a temporary password to the change screen, whatever the address", () => {
    expect(destinationAfterLogin(user({ mustChangePassword: true }), "/admin/usuarios")).toBe(
      "/admin/cambiar-contrasena",
    );
  });

  it("goes to the products when there is no address to go back to", () => {
    expect(destinationAfterLogin(user())).toBe("/admin/productos");
    expect(destinationAfterLogin(user({ role: "SELLER" }))).toBe("/admin/productos");
  });

  it("goes back to the address, when the role may open it", () => {
    expect(destinationAfterLogin(user(), "/admin/usuarios")).toBe("/admin/usuarios");
    expect(destinationAfterLogin(user({ role: "SELLER" }), "/admin/categorias?q=a")).toBe(
      "/admin/categorias?q=a",
    );
  });

  it("keeps a seller out of the users section, also in a nested path", () => {
    const seller = user({ role: "SELLER" });

    expect(destinationAfterLogin(seller, "/admin/usuarios")).toBe("/admin/productos");
    expect(destinationAfterLogin(seller, "/admin/usuarios/123")).toBe("/admin/productos");
  });

  it("ignores an address that leads out of the panel", () => {
    expect(destinationAfterLogin(user(), "https://evil.com")).toBe("/admin/productos");
    expect(destinationAfterLogin(user(), "//evil.com")).toBe("/admin/productos");
  });
});
