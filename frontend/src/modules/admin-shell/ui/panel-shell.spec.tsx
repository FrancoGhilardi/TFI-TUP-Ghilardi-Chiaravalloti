import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionStore } from "@/modules/auth/application/session-store";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { useProductsTotal } from "@/modules/admin-products";
import { useCategoriesTotal } from "@/modules/admin-categories";
import { useUsersTotal } from "@/modules/admin-users";

import { PanelShell } from "./PanelShell";

let pathname = "/admin/productos";
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

vi.mock("@/modules/admin-products", () => ({ useProductsTotal: vi.fn() }));
vi.mock("@/modules/admin-categories", () => ({ useCategoriesTotal: vi.fn() }));
vi.mock("@/modules/admin-users", () => ({ useUsersTotal: vi.fn() }));

const totals = (products?: number, categories?: number, users?: number) => {
  vi.mocked(useProductsTotal).mockReturnValue({ data: products } as ReturnType<
    typeof useProductsTotal
  >);
  vi.mocked(useCategoriesTotal).mockReturnValue({ data: categories } as ReturnType<
    typeof useCategoriesTotal
  >);
  vi.mocked(useUsersTotal).mockReturnValue({ data: users } as ReturnType<typeof useUsersTotal>);
};

const signIn = (role: "ADMIN" | "SELLER", mustChangePassword = false) =>
  act(() =>
    useSessionStore.getState().start({
      accessToken: "token",
      expiresIn: 900,
      user: {
        id: "u1",
        email: "marta@libreriamisueno.com.ar",
        name: "Marta Gómez",
        role,
        mustChangePassword,
      },
    }),
  );

const renderShell = () =>
  render(
    <QueryProvider>
      <PanelShell>
        <p>Contenido del panel</p>
      </PanelShell>
    </QueryProvider>,
  );

beforeEach(() => {
  pathname = "/admin/productos";
  replace.mockReset();
  totals();
  useSessionStore.setState({ status: "loading", accessToken: null, user: null });
});

describe("PanelShell", () => {
  it("shows the screen between the sidebar and the top bar, with who is signed in", () => {
    signIn("SELLER");
    renderShell();

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Contenido del panel");
    expect(screen.getByRole("navigation", { name: "Navegación del panel" })).toBeInTheDocument();
    expect(screen.getByText("Marta Gómez")).toBeInTheDocument();
    expect(screen.getByText("Vendedor")).toBeInTheDocument();
    expect(screen.getByText("MG")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Migas de pan" })).toHaveTextContent("Productos");
  });

  it("keeps the sidebar and the content as the only places of the layout grid", () => {
    signIn("ADMIN");
    renderShell();

    const grid = screen.getByRole("main").closest(".lg\\:grid");
    expect(grid).not.toBeNull();
    expect([...grid!.children].map((child) => child.tagName)).toEqual(["A", "ASIDE", "DIV"]);
  });

  it("shows an admin the users entry", () => {
    signIn("ADMIN");
    renderShell();

    const menu = screen.getByRole("navigation", { name: "Navegación del panel" });
    expect(within(menu).getByRole("link", { name: "Usuarios" })).toHaveAttribute(
      "href",
      "/admin/usuarios",
    );
    expect(within(menu).getByRole("heading", { name: "Administración" })).toBeInTheDocument();
  });

  it("does not show a seller the users entry nor its group", () => {
    signIn("SELLER");
    renderShell();

    const menu = screen.getByRole("navigation", { name: "Navegación del panel" });
    expect(within(menu).queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("heading", { name: "Administración" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Productos" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Categorías" })).toBeInTheDocument();
  });

  it("marks the current entry, also from inside it", () => {
    pathname = "/admin/productos/nuevo";
    signIn("ADMIN");
    renderShell();

    const menu = screen.getByRole("navigation", { name: "Navegación del panel" });
    expect(within(menu).getByRole("link", { name: "Productos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(menu).getByRole("link", { name: "Categorías" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("opens the store in another tab, without marking it as the current page", () => {
    signIn("ADMIN");
    renderShell();

    const store = screen.getByRole("link", { name: "Ver tienda" });
    expect(store).toHaveAttribute("href", "/");
    expect(store).toHaveAttribute("target", "_blank");
    expect(store).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(store).not.toHaveAttribute("aria-current");
  });

  it("tells a seller who opens the users section that it has no permission, and offers a way back", () => {
    pathname = "/admin/usuarios";
    signIn("SELLER");
    renderShell();

    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sin permisos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Productos" })).toHaveAttribute(
      "href",
      "/admin/productos",
    );
    expect(screen.getByRole("navigation", { name: "Navegación del panel" })).toBeInTheDocument();
  });

  it("lets an admin open the users section", () => {
    pathname = "/admin/usuarios";
    signIn("ADMIN");
    renderShell();

    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();
    expect(screen.queryByText("Sin permisos")).not.toBeInTheDocument();
  });

  it("shows only the screen, without the frame, while a temporary password must be changed", () => {
    pathname = "/admin/cambiar-contrasena";
    signIn("ADMIN", true);
    renderShell();

    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Navegación del panel" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });

  it("has a skip link to the content that can receive the focus", async () => {
    signIn("ADMIN");
    const person = userEvent.setup();
    renderShell();

    await person.tab();

    const skip = screen.getByRole("link", { name: "Saltar al contenido" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#panel-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "panel-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("asks before signing out from the user card", async () => {
    signIn("ADMIN");
    const person = userEvent.setup();
    renderShell();

    await person.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("alertdialog", { name: "¿Cerrar sesión?" })).toBeInTheDocument();
  });
});

describe("PanelShell counters", () => {
  it("shows how many there are next to the entries that count something", () => {
    totals(120, 14, 3);
    signIn("ADMIN");
    renderShell();

    const menu = screen.getByRole("navigation", { name: "Navegación del panel" });
    expect(within(menu).getByRole("link", { name: /Productos/ })).toHaveTextContent("120");
    expect(within(menu).getByRole("link", { name: /Categorías/ })).toHaveTextContent("14");
    expect(within(menu).getByRole("link", { name: /Usuarios/ })).toHaveTextContent("3");
    expect(within(menu).getByRole("link", { name: /Inicio/ })).toHaveTextContent(/^Inicio$/);
  });

  it("shows no number for what has not loaded or failed, and keeps the entry", () => {
    totals(undefined, 14, undefined);
    signIn("ADMIN");
    renderShell();

    const menu = screen.getByRole("navigation", { name: "Navegación del panel" });
    expect(within(menu).getByRole("link", { name: /Productos/ })).toHaveTextContent(/^Productos$/);
    expect(within(menu).getByRole("link", { name: /Categorías/ })).toHaveTextContent("14");
  });

  it("asks for the users total only when the role may see it", () => {
    signIn("SELLER");
    renderShell();

    expect(useUsersTotal).toHaveBeenLastCalledWith({ enabled: false });
  });

  it("asks for it when the role is admin", () => {
    signIn("ADMIN");
    renderShell();

    expect(useUsersTotal).toHaveBeenLastCalledWith({ enabled: true });
  });
});

describe("PanelShell on a narrow screen", () => {
  it("closes the menu when the screen changes by other means than its links", async () => {
    signIn("ADMIN");
    const person = userEvent.setup();
    const { rerender } = renderShell();

    await person.click(screen.getByRole("button", { name: "Abrir menú" }));
    await screen.findByRole("dialog", { name: "Menú del panel" });
    pathname = "/admin/mi-cuenta";
    rerender(
      <QueryProvider>
        <PanelShell>
          <p>Contenido del panel</p>
        </PanelShell>
      </QueryProvider>,
    );

    expect(screen.queryByRole("dialog", { name: "Menú del panel" })).not.toBeInTheDocument();
  });

  it("opens the menu as a sheet, closes it with Escape and after following a link", async () => {
    signIn("ADMIN");
    const person = userEvent.setup();
    renderShell();

    await person.click(screen.getByRole("button", { name: "Abrir menú" }));
    const sheet = await screen.findByRole("dialog", { name: "Menú del panel" });
    expect(within(sheet).getByRole("link", { name: "Usuarios" })).toBeInTheDocument();

    await person.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Menú del panel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveFocus();

    await person.click(screen.getByRole("button", { name: "Abrir menú" }));
    const reopened = await screen.findByRole("dialog", { name: "Menú del panel" });
    await person.click(within(reopened).getByRole("link", { name: "Categorías" }));
    expect(screen.queryByRole("dialog", { name: "Menú del panel" })).not.toBeInTheDocument();
  });
});
