import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoryOptions } from "@/modules/admin-categories";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import type { AdminProductDetail, AdminProductRow } from "../domain/admin-product";
import { adminProductsApi } from "../infrastructure/admin-products-client";
import { EditProductPage } from "./EditProductPage";
import { NewProductPage } from "./NewProductPage";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/modules/admin-categories", () => ({ useCategoryOptions: vi.fn() }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-product-images-client", () => ({
  adminProductImagesApi: { list: vi.fn(async () => []) },
}));
vi.mock("../infrastructure/admin-products-client", () => ({
  adminProductsApi: { get: vi.fn(), create: vi.fn(), update: vi.fn(), list: vi.fn() },
}));

const OPTIONS = [
  { id: "c1", label: "Cuadernos", isActive: true },
  { id: "c2", label: " Escolares", isActive: true },
  { id: "c3", label: "Liquidación", isActive: false },
];

const detail = (overrides: Partial<AdminProductDetail> = {}): AdminProductDetail => ({
  id: "p1",
  sku: "LMS-000001",
  slug: "cuaderno-rayado",
  title: "Cuaderno rayado",
  description: null,
  price: "1500.00",
  salePrice: null,
  saleEndsAt: null,
  stock: 12,
  sortOrder: 0,
  isActive: true,
  isFeatured: false,
  isOnSale: false,
  isNew: false,
  newUntil: null,
  primaryCategoryId: "c1",
  categories: [{ id: "c1", name: "Cuadernos", slug: "cuadernos" }],
  relatedProducts: [],
  images: [],
  createdAt: new Date("2026-01-02T12:00:00.000Z"),
  updatedAt: new Date("2026-11-02T12:00:00.000Z"),
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
  ...overrides,
});

const row = (id: string, title: string): AdminProductRow =>
  ({ id, title, sku: `LMS-${id}`, slug: title.toLowerCase() }) as AdminProductRow;

const givenCategories = (state: Partial<ReturnType<typeof useCategoryOptions>> = {}) =>
  vi.mocked(useCategoryOptions).mockReturnValue({
    data: OPTIONS,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    ...state,
  } as unknown as ReturnType<typeof useCategoryOptions>);

const givenProduct = (overrides: Partial<AdminProductDetail> = {}) =>
  vi.mocked(adminProductsApi.get).mockResolvedValue(detail(overrides));

const renderEdit = () =>
  render(
    <QueryProvider>
      <EditProductPage id="p1" />
    </QueryProvider>,
  );

const startUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  push.mockReset();
  for (const call of Object.values(adminProductsApi)) {
    const mocked = vi.mocked(call as () => Promise<unknown>);
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
  }
  vi.mocked(adminProductsApi.list).mockResolvedValue({
    total: 3,
    items: [row("p1", "Cuaderno rayado"), row("p2", "Regla"), row("p3", "Lápiz")],
  });
  givenCategories();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("categories", () => {
  it("lists the categories in a searchable list and leaves a hidden one out of reach", async () => {
    const person = startUser();
    render(
      <QueryProvider>
        <NewProductPage />
      </QueryProvider>,
    );

    await person.click(screen.getByRole("button", { name: "Elegir categorías" }));

    expect(await screen.findByRole("option", { name: /Cuadernos/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Escolares/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Liquidación/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("filters the list while typing", async () => {
    const person = startUser();
    render(
      <QueryProvider>
        <NewProductPage />
      </QueryProvider>,
    );

    await person.click(screen.getByRole("button", { name: "Elegir categorías" }));
    await person.type(await screen.findByLabelText("Buscar categoría"), "escol");

    expect(screen.getByRole("option", { name: /Escolares/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Cuadernos/ })).not.toBeInTheDocument();
  });

  it("makes the first category chosen the primary one and keeps it when another is added", async () => {
    const person = startUser();
    render(
      <QueryProvider>
        <NewProductPage />
      </QueryProvider>,
    );

    expect(screen.getByText("Todavía no elegiste ninguna categoría.")).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Elegir categorías" }));
    await person.click(await screen.findByRole("option", { name: /Escolares/ }));
    await person.click(screen.getByRole("option", { name: /Cuadernos/ }));

    const group = screen.getByRole("radiogroup", { name: "Categorías elegidas" });
    expect(within(group).getByRole("radio", { name: "Hacer principal a Escolares" })).toBeChecked();
    expect(
      within(group).getByRole("radio", { name: "Hacer principal a Cuadernos" }),
    ).not.toBeChecked();
  });

  it("changes the primary one with the radio", async () => {
    givenProduct({
      categories: [
        { id: "c1", name: "Cuadernos", slug: "cuadernos" },
        { id: "c2", name: "Escolares", slug: "escolares" },
      ],
    });
    const person = startUser();
    renderEdit();

    await person.click(await screen.findByRole("radio", { name: "Hacer principal a Escolares" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminProductsApi.update).toHaveBeenCalledWith("p1", {
        categoryIds: ["c1", "c2"],
        primaryCategoryId: "c2",
      }),
    );
  });

  it("promotes the first remaining category when the primary one is taken off", async () => {
    givenProduct({
      categories: [
        { id: "c1", name: "Cuadernos", slug: "cuadernos" },
        { id: "c2", name: "Escolares", slug: "escolares" },
      ],
    });
    const person = startUser();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Quitar Cuadernos" }));

    expect(screen.getByRole("radio", { name: "Hacer principal a Escolares" })).toBeChecked();
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(adminProductsApi.update).toHaveBeenCalledWith("p1", {
        categoryIds: ["c2"],
        primaryCategoryId: "c2",
      }),
    );
  });

  it("wants at least one category", async () => {
    givenProduct();
    const person = startUser();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Quitar Cuadernos" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Elegí al menos una categoría.")).toBeInTheDocument();
    expect(adminProductsApi.update).not.toHaveBeenCalled();
  });

  it("shows the name of a category the product has that the list does not carry", async () => {
    givenProduct({
      categories: [{ id: "c9", name: "Dada de baja", slug: "dada-de-baja" }],
      primaryCategoryId: "c9",
    });
    renderEdit();

    expect(
      await screen.findByRole("radio", { name: "Hacer principal a Dada de baja" }),
    ).toBeChecked();
  });

  it("lets a hidden category the product already has be taken off", async () => {
    givenProduct({
      categories: [
        { id: "c1", name: "Cuadernos", slug: "cuadernos" },
        { id: "c3", name: "Liquidación", slug: "liquidacion" },
      ],
    });
    const person = startUser();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Elegir categorías" }));

    expect(await screen.findByRole("option", { name: /Liquidación/ })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("shows the server's refusal in the section", async () => {
    givenProduct();
    vi.mocked(adminProductsApi.update).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "CATEGORY_UNAVAILABLE",
        message: "Esa categoría no está disponible.",
      }),
    );
    const person = startUser();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Elegir categorías" }));
    await person.click(await screen.findByRole("option", { name: /Escolares/ }));
    await person.keyboard("{Escape}");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Esa categoría no está disponible.")).toBeInTheDocument();
  });

  it("says when the categories are loading and when they could not load, and tries again", async () => {
    const refetch = vi.fn();
    givenCategories({ data: undefined, isPending: true });
    const { unmount } = render(
      <QueryProvider>
        <NewProductPage />
      </QueryProvider>,
    );
    expect(screen.getByText("Cargando categorías…")).toBeInTheDocument();
    unmount();

    givenCategories({ data: undefined, isPending: false, isError: true, refetch });
    const person = startUser();
    render(
      <QueryProvider>
        <NewProductPage />
      </QueryProvider>,
    );
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe("related products", () => {
  const openPicker = async (person: ReturnType<typeof startUser>) => {
    await person.click(await screen.findByRole("button", { name: "Buscar productos" }));
    return screen.findByLabelText("Buscar por título o SKU");
  };

  it("lists current products without the product itself", async () => {
    givenProduct();
    const person = startUser();
    renderEdit();

    await openPicker(person);

    expect(await screen.findByRole("option", { name: /Regla/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Lápiz/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Cuaderno rayado/ })).not.toBeInTheDocument();
  });

  it("searches after the typing pauses, once", async () => {
    givenProduct();
    const person = startUser();
    renderEdit();

    const input = await openPicker(person);
    await screen.findByRole("option", { name: /Regla/ });
    vi.mocked(adminProductsApi.list).mockClear();
    await person.type(input, "reg");
    expect(adminProductsApi.list).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(300));

    await waitFor(() => expect(adminProductsApi.list).toHaveBeenCalledTimes(1));
    expect(adminProductsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: "reg" }),
      expect.any(AbortSignal),
    );
  });

  it("says when nothing is found", async () => {
    givenProduct();
    vi.mocked(adminProductsApi.list).mockResolvedValue({ total: 0, items: [] });
    const person = startUser();
    renderEdit();

    await openPicker(person);

    expect(await screen.findByText("No encontramos productos.")).toBeInTheDocument();
  });

  it("adds the product picked, closes the list and sends the order on save", async () => {
    givenProduct();
    const person = startUser();
    renderEdit();

    await openPicker(person);
    await person.click(await screen.findByRole("option", { name: /Regla/ }));

    const list = screen.getByRole("list", { name: "Productos similares elegidos" });
    expect(within(list).getByText("Regla")).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar por título o SKU")).not.toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(adminProductsApi.update).toHaveBeenCalledWith("p1", { relatedProductIds: ["p2"] }),
    );
  });

  it("does not offer again a product already chosen", async () => {
    givenProduct({ relatedProducts: [{ id: "p2", title: "Regla", sku: "LMS-p2", slug: "regla" }] });
    const person = startUser();
    renderEdit();

    await openPicker(person);

    expect(await screen.findByRole("option", { name: /Lápiz/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Regla/ })).not.toBeInTheDocument();
  });

  it("moves a chosen product up and down, keeping the first from going up and the last from going down", async () => {
    givenProduct({
      relatedProducts: [
        { id: "p2", title: "Regla", sku: "LMS-p2", slug: "regla" },
        { id: "p3", title: "Lápiz", sku: "LMS-p3", slug: "lapiz" },
      ],
    });
    const person = startUser();
    renderEdit();

    expect(await screen.findByRole("button", { name: "Subir Regla" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar Lápiz" })).toBeDisabled();
    await person.click(screen.getByRole("button", { name: "Subir Lápiz" }));

    const titles = within(screen.getByRole("list", { name: "Productos similares elegidos" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(titles[0]).toContain("Lápiz");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(adminProductsApi.update).toHaveBeenCalledWith("p1", {
        relatedProductIds: ["p3", "p2"],
      }),
    );
  });

  it("removes a product, and sends an empty list when none is left", async () => {
    givenProduct({ relatedProducts: [{ id: "p2", title: "Regla", sku: "LMS-p2", slug: "regla" }] });
    const person = startUser();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Quitar Regla" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminProductsApi.update).toHaveBeenCalledWith("p1", { relatedProductIds: [] }),
    );
  });

  it("stops at 4 products and says why", async () => {
    givenProduct({
      relatedProducts: ["a", "b", "c", "d"].map((id) => ({
        id,
        title: `Producto ${id}`,
        sku: `LMS-${id}`,
        slug: id,
      })),
    });
    renderEdit();

    expect(await screen.findByRole("button", { name: "Buscar productos" })).toBeDisabled();
    expect(screen.getByText("Ya elegiste los 4 productos que se muestran.")).toBeInTheDocument();
    expect(screen.getByText("4 de 4")).toBeInTheDocument();
  });

  it("shows the server's refusal in the section", async () => {
    givenProduct({ relatedProducts: [{ id: "p2", title: "Regla", sku: "LMS-p2", slug: "regla" }] });
    vi.mocked(adminProductsApi.update).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "RELATED_PRODUCT_UNAVAILABLE",
        message: "Uno de los productos similares ya no está disponible.",
      }),
    );
    const person = startUser();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Quitar Regla" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Uno de los productos similares ya no está disponible."),
    ).toBeInTheDocument();
  });

  it("tells when the search failed and tries again", async () => {
    givenProduct();
    vi.mocked(adminProductsApi.list).mockRejectedValueOnce(new Error("boom"));
    const person = startUser();
    renderEdit();

    await openPicker(person);
    expect(await screen.findByText("No pudimos buscar productos.")).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("option", { name: /Regla/ })).toBeInTheDocument();
  });
});
