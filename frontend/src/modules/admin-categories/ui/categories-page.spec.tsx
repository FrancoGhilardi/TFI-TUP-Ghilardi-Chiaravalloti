import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { useCategoryOptions } from "../application/useCategoryOptions";
import type { AdminCategoryRow } from "../domain/admin-category";
import type { CategoryOption } from "../domain/category-option";
import { adminCategoriesApi } from "../infrastructure/admin-categories-client";
import { CategoriesPage } from "./CategoriesPage";

const push = vi.fn();
const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("../application/useCategoryOptions", () => ({ useCategoryOptions: vi.fn() }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-categories-client", () => ({
  adminCategoriesApi: { list: vi.fn(), remove: vi.fn(), restore: vi.fn() },
}));

const FIVE_MINUTES = 5 * 60 * 1000;

const row = (overrides: Partial<AdminCategoryRow> = {}): AdminCategoryRow => ({
  id: "c1",
  name: "Librería",
  slug: "libreria",
  description: null,
  parent: null,
  sortOrder: 0,
  isActive: true,
  depth: 0,
  productCount: 12,
  createdAt: new Date("2026-01-02T12:00:00.000Z"),
  updatedAt: new Date(Date.now() - FIVE_MINUTES),
  deletedAt: null,
  ...overrides,
});

const option = (id: string, name: string, depth: number, isActive = true): CategoryOption => ({
  id,
  name,
  depth,
  isActive,
  label: `${" ".repeat(depth)}${name}`,
});

const TREE = [
  option("c1", "Librería", 0),
  option("c2", "Cuadernos", 1),
  option("c3", "Escolares", 2),
  option("c4", "Útiles", 0),
];

const givenOptions = (options: CategoryOption[] | undefined = TREE) =>
  vi.mocked(useCategoryOptions).mockReturnValue({
    data: options,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useCategoryOptions>);

const givenCategories = (items: AdminCategoryRow[], total = items.length) =>
  vi.mocked(adminCategoriesApi.list).mockResolvedValue({ items, total });

const renderPage = () =>
  render(
    <QueryProvider>
      <CategoriesPage />
    </QueryProvider>,
  );

const rowOf = (name: string) => screen.getByRole("link", { name }).closest("tr") as HTMLElement;

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  search = "";
  vi.mocked(adminCategoriesApi.list).mockReset();
  vi.mocked(adminCategoriesApi.remove).mockReset();
  vi.mocked(adminCategoriesApi.restore).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  givenOptions();
});

describe("CategoriesPage", () => {
  it("has a heading and a link to add a category", async () => {
    givenCategories([row()]);
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nueva categoría" })).toHaveAttribute(
      "href",
      "/admin/categorias/nueva",
    );
    await screen.findByText("Librería");
  });

  it("holds the place of the table while it loads", () => {
    vi.mocked(adminCategoriesApi.list).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByLabelText("Cargando categorías")).toHaveAttribute("aria-busy", "true");
  });

  it("asks for what the address says", async () => {
    search = "q=libros&estado=bajas&pagina=2";
    givenCategories([row()], 120);
    renderPage();

    await screen.findByText("Librería");
    expect(adminCategoriesApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: "libros", status: "DELETED", page: 2, limit: 50 }),
      expect.any(AbortSignal),
    );
  });

  it("shows each category with what the table is for", async () => {
    givenCategories([
      row(),
      row({
        id: "c2",
        name: "Cuadernos",
        slug: "cuadernos",
        parent: { id: "c1", name: "Librería", slug: "libreria" },
        depth: 1,
        sortOrder: 3,
        productCount: 4,
        isActive: false,
      }),
    ]);
    renderPage();

    await screen.findByRole("link", { name: "Cuadernos" });
    const root = rowOf("Librería");
    expect(root).toHaveTextContent("/libreria");
    expect(root).toHaveTextContent("Raíz");
    expect(root).toHaveTextContent("12");
    expect(root).toHaveTextContent("Activa");
    expect(root).toHaveTextContent("hace 5 minutos");
    expect(screen.getByRole("link", { name: "Librería" })).toHaveAttribute(
      "href",
      "/admin/categorias/c1",
    );
    const child = rowOf("Cuadernos");
    expect(child).toHaveTextContent("Librería");
    expect(child).toHaveTextContent("Inactiva");
    expect(child).toHaveTextContent("3");
  });

  it("gives the full date of a change as a tooltip of the relative one", async () => {
    givenCategories([row()]);
    renderPage();

    const time = await screen.findByText("hace 5 minutos");
    expect(time).toHaveAttribute("title", expect.stringMatching(/\d{1,2} de \w+ de \d{4}/));
    expect(time.tagName).toBe("TIME");
  });
});

describe("CategoriesPage tree", () => {
  const tree = [
    row(),
    row({
      id: "c2",
      name: "Cuadernos",
      slug: "cuadernos",
      depth: 1,
      parent: { id: "c1", name: "Librería", slug: "libreria" },
    }),
    row({
      id: "c3",
      name: "Escolares",
      slug: "escolares",
      depth: 2,
      parent: { id: "c2", name: "Cuadernos", slug: "cuadernos" },
    }),
  ];

  it("indents each category by its level while the list follows the tree", async () => {
    givenCategories(tree);
    renderPage();

    await screen.findByText("Escolares");
    const indent = (name: string) =>
      (rowOf(name).querySelector("td div[style]") as HTMLElement).style.paddingLeft;
    expect(indent("Librería")).toBe("0px");
    expect(indent("Cuadernos")).toBe("22px");
    expect(indent("Escolares")).toBe("44px");
    expect(rowOf("Escolares")).toHaveTextContent("└");
    expect(rowOf("Librería")).not.toHaveTextContent("└");
  });

  it("shows them flat, without indentation, when searching", async () => {
    search = "q=es";
    givenCategories(tree);
    renderPage();

    await screen.findByText("Escolares");
    expect(rowOf("Escolares")).not.toHaveTextContent("└");
    expect(rowOf("Escolares").querySelector("td div[style]")).toHaveStyle({ paddingLeft: "0px" });
  });

  it("shows them flat when filtering by location", async () => {
    search = "padre=3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b";
    givenCategories(tree);
    renderPage();

    await screen.findByText("Escolares");
    expect(rowOf("Cuadernos")).not.toHaveTextContent("└");
  });

  it("marks as hidden an active category under an inactive one, and nothing else", async () => {
    givenOptions([
      option("c1", "Librería", 0, false),
      option("c2", "Cuadernos", 1),
      option("c3", "Escolares", 2),
      option("c4", "Útiles", 0),
    ]);
    givenCategories([
      row({ id: "c1", name: "Librería", isActive: false }),
      row({ id: "c2", name: "Cuadernos" }),
      row({ id: "c3", name: "Escolares" }),
      row({ id: "c4", name: "Útiles" }),
    ]);
    renderPage();

    await screen.findByText("Útiles");
    expect(rowOf("Cuadernos")).toHaveTextContent("Oculta");
    expect(rowOf("Escolares")).toHaveTextContent("Oculta");
    expect(rowOf("Librería")).not.toHaveTextContent("Oculta");
    expect(rowOf("Útiles")).not.toHaveTextContent("Oculta");
  });

  it("does not mark anything as hidden while the categories to tell it from are not there", async () => {
    givenOptions(undefined);
    givenCategories([row({ id: "c2", name: "Cuadernos", depth: 1 })]);
    renderPage();

    await screen.findByText("Cuadernos");
    expect(screen.queryByText("Oculta")).not.toBeInTheDocument();
  });
});

describe("CategoriesPage filters", () => {
  it("offers to look inside the categories that have subcategories only", async () => {
    givenCategories([row()]);
    renderPage();

    const select = await screen.findByRole("combobox", { name: "Ubicación" });
    const options = within(select)
      .getAllByRole("option")
      .map((item) => item.textContent?.trim());
    expect(options).toEqual(["Cualquier ubicación", "Dentro de Librería", "Dentro de Cuadernos"]);
  });

  it("changes the state and the location from the selects", async () => {
    givenCategories([row()]);
    const person = userEvent.setup();
    renderPage();

    await person.selectOptions(await screen.findByRole("combobox", { name: "Estado" }), "bajas");
    expect(push).toHaveBeenLastCalledWith("/admin/categorias?estado=bajas");
    await person.selectOptions(screen.getByRole("combobox", { name: "Ubicación" }), "c1");
    expect(push).toHaveBeenLastCalledWith("/admin/categorias?padre=c1");
  });

  it("keeps a location of the address that is not on the list", async () => {
    search = "padre=3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b";
    givenCategories([row()]);
    renderPage();

    expect(await screen.findByRole("option", { name: "Ubicación elegida" })).toBeInTheDocument();
  });

  it("offers to clear the filters only when something is filtering", async () => {
    givenCategories([row()]);
    const { unmount } = renderPage();
    await screen.findByText("Librería");
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    unmount();

    search = "q=lib&estado=bajas";
    const person = userEvent.setup();
    renderPage();
    await person.click(await screen.findByRole("button", { name: "Limpiar filtros" }));

    expect(push).toHaveBeenLastCalledWith("/admin/categorias");
  });
});

describe("CategoriesPage delete", () => {
  it("asks first and does nothing if it is cancelled", async () => {
    givenCategories([row()]);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Librería" }));
    const dialog = await screen.findByRole("alertdialog", { name: '¿Dar de baja "Librería"?' });
    await person.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(adminCategoriesApi.remove).not.toHaveBeenCalled();
  });

  it("deletes once confirmed, tells it and reads the list again", async () => {
    givenCategories([row()]);
    vi.mocked(adminCategoriesApi.remove).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Librería" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Categoría dada de baja"));
    expect(adminCategoriesApi.remove).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(adminCategoriesApi.list).toHaveBeenCalledTimes(2));
  });

  it("gives the reason and how many block it when the API refuses", async () => {
    givenCategories([row()]);
    vi.mocked(adminCategoriesApi.remove).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "CATEGORY_IN_USE",
        message: "Es la única categoría de algunos productos.",
        details: { count: 2 },
      }),
    );
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Librería" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Es la única categoría de algunos productos. Hay 2 elementos que la bloquean.",
      ),
    );
    expect(screen.getByText("Librería")).toBeInTheDocument();
  });

  it("disables the actions of a category while its request is on its way", async () => {
    givenCategories([row(), row({ id: "c4", name: "Útiles", slug: "utiles" })]);
    vi.mocked(adminCategoriesApi.remove).mockReturnValue(new Promise(() => {}));
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Dar de baja Librería" }));
    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Dar de baja Librería" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Dar de baja Útiles" })).toBeEnabled();
    expect(adminCategoriesApi.remove).toHaveBeenCalledTimes(1);
  });
});

describe("CategoriesPage deleted categories and restore", () => {
  const deleted = () => row({ deletedAt: new Date("2026-11-05T12:00:00.000Z") });

  it("lists a deleted category without a way to edit it, with the way to bring it back", async () => {
    search = "estado=bajas";
    givenCategories([deleted()]);
    renderPage();

    expect(await screen.findByText("Dada de baja")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Librería" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar Librería" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja Librería" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivar Librería" })).toBeInTheDocument();
  });

  it("restores at once, without asking", async () => {
    search = "estado=bajas";
    givenCategories([deleted()]);
    vi.mocked(adminCategoriesApi.restore).mockResolvedValue(undefined);
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Reactivar Librería" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Categoría reactivada"));
    expect(adminCategoriesApi.restore).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(adminCategoriesApi.list).toHaveBeenCalledTimes(2));
  });

  it("tells why the API refuses to restore and leaves the category where it was", async () => {
    search = "estado=bajas";
    givenCategories([deleted()]);
    vi.mocked(adminCategoriesApi.restore).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "PARENT_CATEGORY_UNAVAILABLE",
        message: "Su categoría superior está dada de baja.",
      }),
    );
    const person = userEvent.setup();
    renderPage();

    await person.click(await screen.findByRole("button", { name: "Reactivar Librería" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Su categoría superior está dada de baja."),
    );
    expect(screen.getByRole("button", { name: "Reactivar Librería" })).toBeInTheDocument();
  });
});

describe("CategoriesPage states and pagination", () => {
  it("offers to clear the filters when nothing matches", async () => {
    search = "q=zzz";
    givenCategories([]);
    const person = userEvent.setup();
    renderPage();

    expect(await screen.findByText("No hay categorías con estos filtros")).toBeInTheDocument();
    await person.click(
      within(screen.getByRole("status")).getByRole("button", { name: "Limpiar filtros" }),
    );

    expect(push).toHaveBeenLastCalledWith("/admin/categorias");
  });

  it("invites to create the first category when there are none at all", async () => {
    givenCategories([]);
    renderPage();

    expect(await screen.findByText("Todavía no hay categorías")).toBeInTheDocument();
  });

  it("says it could not load and tries again on request", async () => {
    vi.mocked(adminCategoriesApi.list).mockRejectedValue(new Error("boom"));
    const person = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar las categorías");
    vi.mocked(adminCategoriesApi.list).mockResolvedValue({ items: [row()], total: 1 });
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Librería")).toBeInTheDocument();
  });

  it("offers the first page when the one asked for is past the last", async () => {
    search = "q=lib&pagina=9";
    givenCategories([], 12);
    renderPage();

    expect(await screen.findByText("Esa página no existe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la primera página" })).toHaveAttribute(
      "href",
      "/admin/categorias?q=lib",
    );
  });

  it("tells which categories it shows and links the pages keeping the filters", async () => {
    search = "estado=activas&pagina=2";
    givenCategories(
      Array.from({ length: 50 }, (_, index) =>
        row({ id: `k${index}`, name: `Categoría ${index}` }),
      ),
      120,
    );
    renderPage();

    expect(await screen.findByText("51–100 de 120")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Paginación" });
    expect(within(nav).getByRole("link", { name: "Página 1" })).toHaveAttribute(
      "href",
      "/admin/categorias?estado=activas",
    );
    expect(within(nav).getByRole("link", { name: "Página 3" })).toHaveAttribute(
      "href",
      "/admin/categorias?estado=activas&pagina=3",
    );
  });

  it("keeps the last rows as a reference but out of reach while the next page loads", async () => {
    givenCategories([row()]);
    const { rerender } = renderPage();
    await screen.findByText("Librería");

    vi.mocked(adminCategoriesApi.list).mockReturnValue(new Promise(() => {}));
    search = "estado=bajas";
    rerender(
      <QueryProvider>
        <CategoriesPage />
      </QueryProvider>,
    );

    const stale = await waitFor(() => {
      const element = screen.getByText("Librería").closest("[inert]");
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    expect(stale).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("1–1 de 1")).toHaveClass("invisible");
  });
});
