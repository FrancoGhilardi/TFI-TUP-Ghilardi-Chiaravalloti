import { describe, expect, it } from "vitest";

import { panelGateDestination } from "./panel-gate";
import type { AuthenticatedUser } from "./user";

const user = (mustChangePassword: boolean): AuthenticatedUser => ({
  id: "u1",
  email: "marta@libreriamisueno.com.ar",
  name: "Marta",
  role: "SELLER",
  mustChangePassword,
});

describe("panelGateDestination", () => {
  it("waits while the session is being restored", () => {
    expect(
      panelGateDestination({ status: "loading", user: null, pathname: "/admin/productos" }),
    ).toBeNull();
  });

  it("sends a person without a session to sign in and back to where they were going", () => {
    expect(
      panelGateDestination({
        status: "anonymous",
        user: null,
        pathname: "/admin/productos/nuevo",
      }),
    ).toBe("/admin/login?next=%2Fadmin%2Fproductos%2Fnuevo");
  });

  it("sends a person who closed the session to a plain sign in, without a way back", () => {
    expect(
      panelGateDestination({
        status: "signedOut",
        user: null,
        pathname: "/admin/productos",
        search: "pagina=3",
      }),
    ).toBe("/admin/login");
  });

  it("keeps the query of the address in the way back", () => {
    expect(
      panelGateDestination({
        status: "anonymous",
        user: null,
        pathname: "/admin/productos",
        search: "pagina=3&q=lapiz",
      }),
    ).toBe("/admin/login?next=%2Fadmin%2Fproductos%3Fpagina%3D3%26q%3Dlapiz");
  });

  it("waits while the session could not be looked up", () => {
    expect(
      panelGateDestination({ status: "unavailable", user: null, pathname: "/admin/productos" }),
    ).toBeNull();
  });

  it("lets a person with a session through", () => {
    expect(
      panelGateDestination({
        status: "authenticated",
        user: user(false),
        pathname: "/admin/productos",
      }),
    ).toBeNull();
  });

  it("sends a person with a temporary password to change it, from any screen", () => {
    for (const pathname of ["/admin/productos", "/admin/usuarios"]) {
      expect(panelGateDestination({ status: "authenticated", user: user(true), pathname })).toBe(
        "/admin/cambiar-contrasena",
      );
    }
  });

  it("does not send them away from the screen to change it", () => {
    expect(
      panelGateDestination({
        status: "authenticated",
        user: user(true),
        pathname: "/admin/cambiar-contrasena",
      }),
    ).toBeNull();
  });
});
