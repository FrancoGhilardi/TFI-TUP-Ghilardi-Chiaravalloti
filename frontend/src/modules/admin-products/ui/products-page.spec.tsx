import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoryOptions } from "@/modules/admin-categories";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import type { AdminProductRow } from "../domain/admin-product";
import { adminProductsApi } from "../infrastructure/admin-products-client";
import { ProductsPage } from "./ProductsPage";

const push = vi.fn();
const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/modules/admin-categories", () => ({ useCategoryOptions: vi.fn() }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-products-client", () => ({
  adminProductsApi: { list: vi.fn(), remove: vi.fn(), restore: vi.fn() },
}));

const FIVE_MINUTES = 5 * 60 * 1000;

const row = (overrides: Partial<AdminProductRow> = {}): AdminProductRow => ({
  id: "p1",
  sku: "LMS-000001",
  title: "Cuaderno rayado",
  slug: "cuaderno-rayado",
  price: "1500.00",
  salePrice: null,
  stock: 12,
  isActive: true,
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  primaryCategory: { id: "c1", name: "Cuadernos" },
  thumbnailUrl: null,
  updatedAt: new Date(Date.now() - FIVE_MINUTES),
  deletedAt: null,
  ...overrides,
});

const givenProducts = (items: AdminProductRow[], total = items.length) =>
  vi.mocked(adminProductsApi.list).mockResolvedValue({ items, total });

const renderPage = () =>
  render(
    <QueryProvider>
      <ProductsPage />
    </QueryProvider>,
  );

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  search = "";
  vi.mocked(adminProductsApi.list).mockReset();
  vi.mocked(adminProductsApi.remove).mockReset();
  vi.mocked(adminProductsApi.restore).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(useCategoryOptions).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useCategoryOptions
  >);
});

describe("ProductsPage", () => {
  it("has a heading and a link to add a product", async () => {
    givenProducts([row()]);
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Productos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuevo producto" })).toHaveAttribute(
      "href",
      "/admin/productos/nuevo",
    );
    await screen.findByText("Cuaderno rayado");
  });

  it("holds the place of the table while it loads", () => {
    vi.mocked(adminProductsApi.list).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByLabelText("Cargando productos")).toHaveAttribute("aria-busy", "true");
  });

  it("shows each product with what the table is for", async () => {
    givenProducts([
      row(),
      row({
        id: "p2",
        sku: "LMS-000002",
        title: "Lápiz negro",
        slug: "lapiz-negro",
        price: "800.00",
        salePrice: "600.00",
        isOnSale: true,
        isFeatured: true,
        isNew: true,
        stock: 0,
        isActive: false,
        primaryCategory: null,
      }),
    ]);
    renderPage();

    const table = await screen.findByRole("table", { name: "Productos" });
    const [, first, second] = within(table).getAllByRole("row");
    expect(within(first).getByRole("link", { name: "Cuaderno rayado" })).toHaveAttribute(
      "href",
      "/admin/productos/p1",
    );
    expect(first).toHaveTextContent("/cuaderno-rayado");
    expect(first).toHaveTextContent("LMS-000001");
    expect(first).toHaveTextContent("Cuadernos");
    expect(first).toHaveTextContent("$ 1.500");
    expect(first).toHaveTextContent("12");
    expect(first).toHaveTextContent("Activo");
    expect(first).toHaveTextContent("hace 5 minutos");

    expect(second).toHaveTextContent("$ 600");
    expect(second).toHaveTextContent("$ 800");
    expect(second).toHaveTextContent("Dest.");
    expect(second).toHaveTextContent("Oferta");
    expect(second).toHaveTextContent("Nuevo");
    expect(second).toHaveTextContent("Inactivo");
    expect(within(second).getByText("0")).toBeInTheDocument();
  });

  it("gives the full date of a change as a tooltip of the relative one", async () => {
    givenProducts([row()]);
    renderPage();

    const time = await screen.findByText("hace 5 minutos");
    expect(time).toHaveAttribute("title", expect.stringMatching(/\d{1,2} de \w+ de \d{4}/));
    expect(time.tagName).toBe("TIME");
  });

  it("offers to open, give a delete to or restore each product by name", async () => {
    givenProducts([row(), row({ id: "p2", title: "Regla", deletedAt: new Date() })]);
    renderPage();

    expect(await screen.findByRole("link", { name: "Editar Cuaderno rayado" })).toHaveAttribute(
      "href",
      "/admin/productos/p1",
    );
    expect(screen.getByRole("button", { name: "Dar de baja Cuaderno rayado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver Regla" })).toHaveAttribute(
      "href",
      "/admin/productos/p2",
    );
    expect(screen.getByRole("button", { name: "Reactivar Regla" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja Regla" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reactivar Cuaderno rayado" }),
    ).not.toBeInTheDocument();
  });

  it("marks a deleted product with its state", async () => {
    search = "estado=bajas";
    givenProducts([row({ deletedAt: new Date() })]);
    renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Dado de baja")).toBeInTheDocument();
  });

  it("asks for what the address says", async () => {
    search = "q=regla&estado=bajas&orden=precio&dir=desc&pagina=2";
    givenProducts([row()], 45);
    renderPage();

    await screen.findByText("Cuaderno rayado");
    expect(adminProductsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "regla",
        status: "DELETED",
        sortBy: "PRICE",
        sortDir: "DESC",
        page: 2,
        limit: 20,
      }),
      expect.any(AbortSignal),
    );
  });
});

describe("ProductsPage sort", () => {
  it("marks the column the list is sorted by and which way", async () => {
    givenProducts([row()]);
    renderPage();

    const modified = await screen.findByRole("columnheader", { name: /Modificado/ });
    expect(modified).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Precio/ })).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });

  it("sorts by a column on click and flips the order on the second one", async () => {
    search = "orden=precio";
    givenProducts([row()]);
    const person = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("columnheader", { name: /Precio/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await person.click(screen.getByRole("button", { name: "Ordenar por Precio" }));
    expect(push).toHaveBeenLastCalledWith("/admin/productos?orden=precio&dir=desc");

    await person.click(screen.getByRole("button", { name: "Ordenar por Stock" }));
    expect(push).toHaveBeenLastCalledWith("/admin/productos?orden=stock");
  });

  it("can be sorted from the keyboard", async () => {
    givenProducts([row()]);
    const person = userEvent.setup();
    renderPage();

    await screen.findByText("Cuaderno rayado");
    screen.getByRole("button", { name: "Ordenar por SKU" }).focus();
    await person.keyboard("{Enter}");

    expect(push).toHaveBeenLastCalledWith("/admin/productos?orden=sku");
  });
});

describe("ProductsPage delete", () => {
  it("asks first and does nothing if it is cancelled", async () => {
    givenProducts([row()]);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Cuaderno rayado" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: '¿Dar de baja "Cuaderno rayado"?',
    });
    expect(dialog).toHaveTextContent("podés reactivarlo cuando quieras");
    await person.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(adminProductsApi.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does nothing with Escape either", async () => {
    givenProducts([row()]);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Cuaderno rayado" }));
    await screen.findByRole("alertdialog");
    await person.keyboard("{Escape}");

    expect(adminProductsApi.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Dar de baja Cuaderno rayado" })).toHaveFocus();
  });

  it("deletes once confirmed, tells it and reads the list again", async () => {
    givenProducts([row()]);
    vi.mocked(adminProductsApi.remove).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Cuaderno rayado" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Producto dado de baja"));
    expect(adminProductsApi.remove).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(adminProductsApi.list).toHaveBeenCalledTimes(2));
  });

  it("shows the API's message when the delete is refused", async () => {
    givenProducts([row()]);
    vi.mocked(adminProductsApi.remove).mockRejectedValue(
      new ApiError({ status: 403, code: "INSUFFICIENT_ROLE", message: "No tenés permisos." }),
    );
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Cuaderno rayado" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No tenés permisos."));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText("Cuaderno rayado")).toBeInTheDocument();
  });

  it("disables the actions of a product while its request is on its way", async () => {
    givenProducts([row(), row({ id: "p2", title: "Regla" })]);
    vi.mocked(adminProductsApi.remove).mockReturnValue(new Promise(() => {}));
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Cuaderno rayado" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Dar de baja Cuaderno rayado" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Dar de baja Regla" })).toBeEnabled();
    expect(adminProductsApi.remove).toHaveBeenCalledTimes(1);
  });
});

describe("ProductsPage restore", () => {
  it("restores at once, without asking", async () => {
    search = "estado=bajas";
    givenProducts([row({ deletedAt: new Date() })]);
    vi.mocked(adminProductsApi.restore).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Reactivar Cuaderno rayado" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Producto reactivado"));
    expect(adminProductsApi.restore).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(adminProductsApi.list).toHaveBeenCalledTimes(2));
  });

  it("tells why the API refuses to restore and leaves the product where it was", async () => {
    search = "estado=bajas";
    givenProducts([row({ deletedAt: new Date() })]);
    vi.mocked(adminProductsApi.restore).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "PRODUCT_WITHOUT_CATEGORY",
        message: "Reactivá alguna de sus categorías primero.",
      }),
    );
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Reactivar Cuaderno rayado" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Reactivá alguna de sus categorías primero."),
    );
    expect(screen.getByRole("button", { name: "Reactivar Cuaderno rayado" })).toBeInTheDocument();
  });
});

describe("ProductsPage states", () => {
  it("says there is nothing for these filters and offers to clear them", async () => {
    search = "q=zzz";
    givenProducts([]);
    const person = userEvent.setup();
    renderPage();

    expect(await screen.findByText("No hay productos con estos filtros")).toBeInTheDocument();
    const clear = within(screen.getByRole("status")).getByRole("button", {
      name: "Limpiar filtros",
    });
    await person.click(clear);

    expect(push).toHaveBeenLastCalledWith("/admin/productos");
  });

  it("keeps the sort when the filters are cleared", async () => {
    search = "q=zzz&orden=precio";
    givenProducts([]);
    const person = userEvent.setup();
    renderPage();

    await screen.findByText("No hay productos con estos filtros");
    await person.click(
      within(screen.getByRole("status")).getByRole("button", { name: "Limpiar filtros" }),
    );

    expect(push).toHaveBeenLastCalledWith("/admin/productos?orden=precio");
  });

  it("invites to add the first product when there are none at all", async () => {
    givenProducts([]);
    renderPage();

    expect(await screen.findByText("Todavía no hay productos")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Nuevo producto" });
    expect(links.every((link) => link.getAttribute("href") === "/admin/productos/nuevo")).toBe(
      true,
    );
  });

  it("says it could not load and tries again on request", async () => {
    vi.mocked(adminProductsApi.list).mockRejectedValue(new Error("boom"));
    const person = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar los productos");
    vi.mocked(adminProductsApi.list).mockResolvedValue({ items: [row()], total: 1 });
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Cuaderno rayado")).toBeInTheDocument();
  });

  it("offers the first page when the one asked for is past the last", async () => {
    search = "q=regla&pagina=9";
    givenProducts([], 12);
    renderPage();

    expect(await screen.findByText("Esa página no existe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la primera página" })).toHaveAttribute(
      "href",
      "/admin/productos?q=regla",
    );
  });

  it("keeps the rows it had when a later refresh fails", async () => {
    givenProducts([row()]);
    vi.mocked(adminProductsApi.remove).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();
    await person.click(await screen.findByRole("button", { name: "Dar de baja Cuaderno rayado" }));
    vi.mocked(adminProductsApi.list).mockRejectedValue(new Error("boom"));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() => expect(adminProductsApi.list).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Cuaderno rayado")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar los productos")).not.toBeInTheDocument();
  });
});

describe("ProductsPage pagination", () => {
  it("tells which products it shows and links the pages keeping the filters", async () => {
    search = "q=regla&estado=activos&pagina=2";
    givenProducts(
      Array.from({ length: 20 }, (_, index) =>
        row({ id: `p${index}`, title: `Producto ${index}` }),
      ),
      45,
    );
    renderPage();

    expect(await screen.findByText("21–40 de 45")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Paginación" });
    expect(within(nav).getByRole("link", { name: "Página 1" })).toHaveAttribute(
      "href",
      "/admin/productos?q=regla&estado=activos",
    );
    expect(within(nav).getByRole("link", { name: "Página 3" })).toHaveAttribute(
      "href",
      "/admin/productos?q=regla&estado=activos&pagina=3",
    );
    expect(within(nav).getByRole("link", { name: "Página 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows no pages when everything fits in one", async () => {
    givenProducts([row()], 1);
    renderPage();

    expect(await screen.findByText("1–1 de 1")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument();
  });
});

describe("ProductsPage while the next page loads", () => {
  it("keeps the last rows as a reference but out of reach until the new ones arrive", async () => {
    givenProducts([row()]);
    const { rerender } = renderPage();
    await screen.findByText("Cuaderno rayado");

    let finish: (value: { items: AdminProductRow[]; total: number }) => void = () => {};
    vi.mocked(adminProductsApi.list).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    search = "orden=precio";
    rerender(
      <QueryProvider>
        <ProductsPage />
      </QueryProvider>,
    );

    const stale = await waitFor(() => {
      const element = screen.getByText("Cuaderno rayado").closest("[inert]");
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    expect(stale).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("1–1 de 1")).toHaveClass("invisible");

    finish({ items: [row({ id: "p9", title: "Regla" })], total: 1 });
    expect(await screen.findByText("Regla")).toBeInTheDocument();
    expect(screen.getByText("Regla").closest("[inert]")).toBeNull();
  });
});
