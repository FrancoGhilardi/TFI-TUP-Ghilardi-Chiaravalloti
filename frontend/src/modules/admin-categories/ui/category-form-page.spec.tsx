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
import { EditCategoryPage } from "./EditCategoryPage";
import { NewCategoryPage } from "./NewCategoryPage";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../application/useCategoryOptions", () => ({ useCategoryOptions: vi.fn() }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-categories-client", () => ({
  adminCategoriesApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
  },
}));

const option = (id: string, name: string, depth: number, isActive = true): CategoryOption => ({
  id,
  name,
  depth,
  isActive,
  label: `${" ".repeat(depth)}${name}${isActive ? "" : " (inactiva)"}`,
});

/**
 * Librería (c1)
 *   Cuadernos (c2)
 *     Escolares (c3)
 *     Artísticos (c5)
 *   Papelería (c6)
 * Útiles (c4)
 */
const TREE = [
  option("c1", "Librería", 0),
  option("c2", "Cuadernos", 1),
  option("c3", "Escolares", 2),
  option("c5", "Artísticos", 2),
  option("c6", "Papelería", 1),
  option("c4", "Útiles", 0),
];

const category = (overrides: Partial<AdminCategoryRow> = {}): AdminCategoryRow => ({
  id: "c2",
  name: "Cuadernos",
  slug: "cuadernos",
  description: "Para la escuela",
  parent: { id: "c1", name: "Librería", slug: "libreria" },
  sortOrder: 2,
  isActive: true,
  depth: 1,
  productCount: 7,
  createdAt: new Date("2026-01-02T12:00:00.000Z"),
  updatedAt: new Date("2026-11-02T12:00:00.000Z"),
  deletedAt: null,
  ...overrides,
});

const givenOptions = (state: Partial<ReturnType<typeof useCategoryOptions>> = {}) =>
  vi.mocked(useCategoryOptions).mockReturnValue({
    data: TREE,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    ...state,
  } as unknown as ReturnType<typeof useCategoryOptions>);

const givenCategory = (overrides: Partial<AdminCategoryRow> = {}) =>
  vi.mocked(adminCategoriesApi.get).mockResolvedValue(category(overrides));

const renderEdit = (id = "c2") =>
  render(
    <QueryProvider>
      <EditCategoryPage id={id} />
    </QueryProvider>,
  );

const renderNew = () =>
  render(
    <QueryProvider>
      <NewCategoryPage />
    </QueryProvider>,
  );

const offered = () =>
  within(screen.getByRole("combobox", { name: "Categoría padre" }))
    .getAllByRole("option")
    .map((item) => item.textContent?.trim());

beforeEach(() => {
  push.mockReset();
  for (const call of Object.values(adminCategoriesApi)) {
    const mocked = vi.mocked(call as () => Promise<unknown>);
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
  }
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  givenOptions();
});

describe("EditCategoryPage loading", () => {
  it("holds the place of the form while the category loads", () => {
    vi.mocked(adminCategoriesApi.get).mockReturnValue(new Promise(() => {}));
    renderEdit();

    expect(screen.getByLabelText("Cargando la categoría")).toHaveAttribute("aria-busy", "true");
  });

  it("says the category does not exist when the API says so", async () => {
    vi.mocked(adminCategoriesApi.get).mockRejectedValue(
      new ApiError({ status: 404, code: "CATEGORY_NOT_FOUND", message: "No existe." }),
    );
    renderEdit();

    expect(await screen.findByText("No encontramos esa categoría")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a categorías" })).toHaveAttribute(
      "href",
      "/admin/categorias",
    );
  });

  it("offers to try again when it could not load", async () => {
    vi.mocked(adminCategoriesApi.get).mockRejectedValueOnce(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin conexión." }),
    );
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar la categoría");
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Cuadernos" })).toBeInTheDocument();
  });
});

describe("EditCategoryPage", () => {
  it("shows the category in the form, with its slug and product count as plain text", async () => {
    givenCategory({ isActive: false });
    renderEdit();

    expect(await screen.findByLabelText("Nombre")).toHaveValue("Cuadernos");
    expect(screen.getByLabelText(/Descripción/)).toHaveValue("Para la escuela");
    expect(screen.getByRole("combobox", { name: "Categoría padre" })).toHaveValue("c1");
    expect(screen.getByLabelText("Posición")).toHaveValue(2);
    expect(screen.getByRole("radio", { name: "Inactiva" })).toBeChecked();
    const header = screen.getByRole("heading", { level: 1 }).closest("header")!;
    expect(header).toHaveTextContent("/cuadernos");
    expect(header).toHaveTextContent("7 productos");
    expect(header).toHaveTextContent("Inactiva");
    expect(screen.queryByRole("textbox", { name: "Enlace" })).not.toBeInTheDocument();
  });

  it("has nothing to save until something changes", async () => {
    givenCategory();
    renderEdit();

    await screen.findByLabelText("Nombre");
    expect(screen.getByText("Sin cambios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("sends only what changed, tells it and goes back to the list", async () => {
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    const position = await screen.findByLabelText("Posición");
    await person.clear(position);
    await person.type(position, "5");
    expect(screen.getByText("Hay cambios sin guardar")).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminCategoriesApi.update).toHaveBeenCalledWith("c2", { sortOrder: 5 }),
    );
    expect(toast.success).toHaveBeenCalledWith("Cambios guardados");
    expect(push).toHaveBeenCalledWith("/admin/categorias");
    expect(adminCategoriesApi.get).toHaveBeenCalledTimes(1);
  });

  it("sends the state and an emptied description as an empty text", async () => {
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    await person.clear(await screen.findByLabelText(/Descripción/));
    await person.click(screen.getByRole("radio", { name: "Inactiva" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminCategoriesApi.update).toHaveBeenCalledWith("c2", {
        description: "",
        isActive: false,
      }),
    );
  });

  it("marks a field that is not valid and does not send", async () => {
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    const name = await screen.findByLabelText("Nombre");
    await person.clear(name);
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Escribí el nombre.")).toBeInTheDocument();
    expect(name).toBeInvalid();
    expect(name).toHaveFocus();
    expect(adminCategoriesApi.update).not.toHaveBeenCalled();
  });

  it("shows the server's refusal next to the field and keeps what was typed", async () => {
    givenCategory();
    vi.mocked(adminCategoriesApi.update).mockRejectedValue(
      new ApiError({
        status: 409,
        code: "CATEGORY_NAME_IN_USE",
        message: "Ese nombre ya lo usa otra categoría.",
      }),
    );
    const person = userEvent.setup();
    renderEdit();

    const name = await screen.findByLabelText("Nombre");
    await person.clear(name);
    await person.type(name, "Útiles");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Ese nombre ya lo usa otra categoría.")).toBeInTheDocument();
    expect(name).toHaveValue("Útiles");
    expect(name).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a failure that belongs to no field in an alert above the form", async () => {
    givenCategory();
    vi.mocked(adminCategoriesApi.update).mockRejectedValue(
      new ApiError({ status: 500, code: "INTERNAL_ERROR", message: "Algo salió mal." }),
    );
    const person = userEvent.setup();
    renderEdit();

    const position = await screen.findByLabelText("Posición");
    await person.clear(position);
    await person.type(position, "1");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Algo salió mal.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("alert").some((alert) => alert.textContent === "Algo salió mal."),
    ).toBe(true);
  });

  it("asks before leaving with changes, and not otherwise", async () => {
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/categorias",
    );
    await person.type(screen.getByLabelText("Posición"), "1");
    await person.click(screen.getByRole("button", { name: "Cancelar" }));

    const dialog = await screen.findByRole("alertdialog", { name: "¿Salir sin guardar?" });
    await person.click(within(dialog).getByRole("button", { name: "Salir" }));
    expect(push).toHaveBeenCalledWith("/admin/categorias");
  });
});

describe("EditCategoryPage parent selector (no cycles)", () => {
  it("leaves out a root and all its subtree, however deep", async () => {
    givenCategory({ id: "c1", name: "Librería", parent: null, depth: 0 });
    renderEdit("c1");

    await screen.findByLabelText("Nombre");

    expect(offered()).toEqual(["Sin categoría padre (raíz)", "Útiles"]);
  });

  it("leaves out a middle category and what is below it, keeping its ancestors and siblings", async () => {
    givenCategory();
    renderEdit();

    await screen.findByLabelText("Nombre");

    expect(offered()).toEqual(["Sin categoría padre (raíz)", "Librería", "Papelería", "Útiles"]);
  });

  it("leaves out only itself for a leaf", async () => {
    givenCategory({
      id: "c3",
      name: "Escolares",
      parent: { id: "c2", name: "Cuadernos", slug: "cuadernos" },
      depth: 2,
    });
    renderEdit("c3");

    await screen.findByLabelText("Nombre");

    expect(offered()).toEqual([
      "Sin categoría padre (raíz)",
      "Librería",
      "Cuadernos",
      "Artísticos",
      "Papelería",
      "Útiles",
    ]);
  });

  it("offers every category when creating one", async () => {
    renderNew();

    expect(offered()).toEqual([
      "Sin categoría padre (raíz)",
      "Librería",
      "Cuadernos",
      "Escolares",
      "Artísticos",
      "Papelería",
      "Útiles",
    ]);
  });

  it("never offers any descendant of the category, whichever one is edited", async () => {
    const descendants: Record<string, string[]> = {
      c1: ["Cuadernos", "Escolares", "Artísticos", "Papelería"],
      c2: ["Escolares", "Artísticos"],
      c3: [],
      c4: [],
    };
    for (const [id, below] of Object.entries(descendants)) {
      givenCategory({
        id,
        name: TREE.find((item) => item.id === id)!.name,
        parent: null,
        depth: 0,
      });
      const { unmount } = renderEdit(id);
      await screen.findByLabelText("Nombre");

      const choices = offered();
      for (const name of below) {
        expect(choices).not.toContain(name);
      }
      expect(choices).not.toContain(TREE.find((item) => item.id === id)!.name);
      unmount();
    }
  });

  it("moves the category to another parent", async () => {
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    await person.selectOptions(
      await screen.findByRole("combobox", { name: "Categoría padre" }),
      "c4",
    );
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminCategoriesApi.update).toHaveBeenCalledWith("c2", { parentId: "c4" }),
    );
  });

  it("moves the category to the root by sending a null parent", async () => {
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    await person.selectOptions(
      await screen.findByRole("combobox", { name: "Categoría padre" }),
      "Sin categoría padre (raíz)",
    );
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminCategoriesApi.update).toHaveBeenCalledWith("c2", { parentId: null }),
    );
  });

  it("keeps the current parent on the list when it is no longer among the categories", async () => {
    givenOptions({ data: TREE.filter((item) => item.id !== "c1") } as never);
    givenCategory();
    renderEdit();

    await screen.findByLabelText("Nombre");

    expect(screen.getByRole("combobox", { name: "Categoría padre" })).toHaveValue("c1");
    expect(offered()).toContain("Categoría padre actual");
  });

  it("cannot be changed while the categories load, so a list that has not come is not taken for no parent", async () => {
    givenOptions({ data: undefined, isPending: true } as never);
    givenCategory();
    renderEdit();

    await screen.findByLabelText("Nombre");

    expect(screen.getByRole("combobox", { name: "Categoría padre" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Categoría padre" })).toHaveValue("c1");
    expect(screen.getByText("Cargando categorías…")).toBeInTheDocument();
  });

  it("says when the categories could not load, and tries again", async () => {
    const refetch = vi.fn();
    givenOptions({ data: undefined, isPending: false, isError: true, refetch } as never);
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    await screen.findByLabelText("Nombre");
    expect(screen.getByRole("combobox", { name: "Categoría padre" })).toBeDisabled();
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the cycle the server refuses at the parent field", async () => {
    givenCategory();
    vi.mocked(adminCategoriesApi.update).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "CATEGORY_CYCLE",
        message: "Una categoría no puede quedar dentro de sí misma.",
      }),
    );
    const person = userEvent.setup();
    renderEdit();

    await person.selectOptions(
      await screen.findByRole("combobox", { name: "Categoría padre" }),
      "c6",
    );
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Una categoría no puede quedar dentro de sí misma."),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Categoría padre" })).toBeInvalid();
  });
});

describe("EditCategoryPage actions and deleted categories", () => {
  it("gives the category a logical delete from the header, after asking", async () => {
    givenCategory();
    const person = userEvent.setup();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));
    await person.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Dar de baja" }),
    );

    await waitFor(() => expect(adminCategoriesApi.remove).toHaveBeenCalledWith("c2"));
  });

  it("shows a deleted category read-only, with the way to bring it back", async () => {
    givenCategory({ deletedAt: new Date("2026-11-05T12:00:00.000Z") });
    const person = userEvent.setup();
    renderEdit();

    const notice = (await screen.findByText(/dada de baja desde/)).closest(
      "[role=status]",
    ) as HTMLElement;
    expect(notice).toHaveTextContent("5 de noviembre de 2026");
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre").closest("[inert]")).not.toBeNull();

    await person.click(within(notice).getByRole("button", { name: "Reactivar" }));
    await waitFor(() => expect(adminCategoriesApi.restore).toHaveBeenCalledWith("c2"));
  });
});

describe("NewCategoryPage", () => {
  it("shows an empty form with no slug", () => {
    renderNew();

    expect(screen.getByRole("heading", { level: 1, name: "Nueva categoría" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Posición")).toHaveValue(0);
    expect(screen.getByRole("radio", { name: "Activa" })).toBeChecked();
    expect(screen.getByText(/lo genera el sistema al guardar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear categoría" })).toBeEnabled();
  });

  it("marks what is missing and sends nothing, with the first problem focused", async () => {
    const person = userEvent.setup();
    renderNew();

    await person.click(screen.getByRole("button", { name: "Crear categoría" }));

    expect(await screen.findByText("Escribí el nombre.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
    expect(adminCategoriesApi.create).not.toHaveBeenCalled();
  });

  it("sends the category, tells it and goes back to the list", async () => {
    const person = userEvent.setup();
    renderNew();

    await person.type(screen.getByLabelText("Nombre"), "Mochilas");
    await person.selectOptions(screen.getByRole("combobox", { name: "Categoría padre" }), "c4");
    await person.type(screen.getByLabelText(/Descripción/), "Para llevar todo");
    await person.click(screen.getByRole("button", { name: "Crear categoría" }));

    await waitFor(() =>
      expect(adminCategoriesApi.create).toHaveBeenCalledWith({
        name: "Mochilas",
        description: "Para llevar todo",
        parentId: "c4",
        sortOrder: 0,
        isActive: true,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Categoría creada");
    expect(push).toHaveBeenCalledWith("/admin/categorias");
  });

  it("creates a root category when no parent is chosen", async () => {
    const person = userEvent.setup();
    renderNew();

    await person.type(screen.getByLabelText("Nombre"), "Mochilas");
    await person.click(screen.getByRole("button", { name: "Crear categoría" }));

    await waitFor(() => expect(adminCategoriesApi.create).toHaveBeenCalled());
    expect(vi.mocked(adminCategoriesApi.create).mock.calls[0][0]).not.toHaveProperty("parentId");
  });

  it("shows the server's refusal at the parent and keeps the form", async () => {
    vi.mocked(adminCategoriesApi.create).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "PARENT_CATEGORY_UNAVAILABLE",
        message: "Esa categoría ya no está disponible.",
      }),
    );
    const person = userEvent.setup();
    renderNew();

    await person.type(screen.getByLabelText("Nombre"), "Mochilas");
    await person.selectOptions(screen.getByRole("combobox", { name: "Categoría padre" }), "c4");
    await person.click(screen.getByRole("button", { name: "Crear categoría" }));

    expect(await screen.findByText("Esa categoría ya no está disponible.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Mochilas");
  });

  it("asks before leaving once something was typed", async () => {
    const person = userEvent.setup();
    renderNew();

    expect(screen.getByRole("link", { name: "Cancelar" })).toBeInTheDocument();
    await person.type(screen.getByLabelText("Nombre"), "Mo");

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
