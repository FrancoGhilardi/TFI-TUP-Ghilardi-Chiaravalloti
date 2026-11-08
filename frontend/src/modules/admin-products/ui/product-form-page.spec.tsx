import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoryOptions } from "@/modules/admin-categories";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import type { AdminProductDetail } from "../domain/admin-product";
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
  adminProductsApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
  },
}));

const detail = (overrides: Partial<AdminProductDetail> = {}): AdminProductDetail => ({
  id: "p1",
  sku: "LMS-000001",
  slug: "cuaderno-rayado",
  title: "Cuaderno rayado",
  description: "Tapa dura",
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
  createdBy: { id: "u1", name: "Marta" },
  updatedBy: { id: "u2", name: "Lucía" },
  ...overrides,
});

const givenProduct = (overrides: Partial<AdminProductDetail> = {}) =>
  vi.mocked(adminProductsApi.get).mockResolvedValue(detail(overrides));

const renderEdit = () =>
  render(
    <QueryProvider>
      <EditProductPage id="p1" />
    </QueryProvider>,
  );

const renderNew = () =>
  render(
    <QueryProvider>
      <NewProductPage />
    </QueryProvider>,
  );

beforeEach(() => {
  push.mockReset();
  for (const call of Object.values(adminProductsApi)) {
    const mocked = vi.mocked(call as () => Promise<unknown>);
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
  }
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(useCategoryOptions).mockReturnValue({
    data: [{ id: "c1", label: "Cuadernos", isActive: true }],
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useCategoryOptions>);
});

describe("EditProductPage loading", () => {
  it("holds the place of the form while the product loads", () => {
    vi.mocked(adminProductsApi.get).mockReturnValue(new Promise(() => {}));
    renderEdit();

    expect(screen.getByLabelText("Cargando el producto")).toHaveAttribute("aria-busy", "true");
  });

  it("says the product does not exist when the API says so", async () => {
    vi.mocked(adminProductsApi.get).mockRejectedValue(
      new ApiError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "No existe." }),
    );
    renderEdit();

    expect(await screen.findByText("No encontramos ese producto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a productos" })).toHaveAttribute(
      "href",
      "/admin/productos",
    );
  });

  it("offers to try again when it could not load", async () => {
    vi.mocked(adminProductsApi.get).mockRejectedValueOnce(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin conexión." }),
    );
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar el producto");
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Cuaderno rayado" }),
    ).toBeInTheDocument();
  });
});

describe("EditProductPage", () => {
  it("shows the product in the form, with its SKU and slug as plain text", async () => {
    givenProduct({
      salePrice: "1200.50",
      isOnSale: true,
      saleEndsAt: new Date("2099-06-15T02:59:00.000Z"),
    });
    renderEdit();

    expect(await screen.findByLabelText("Título")).toHaveValue("Cuaderno rayado");
    expect(screen.getByLabelText(/Descripción/)).toHaveValue("Tapa dura");
    expect(screen.getByLabelText("Precio ($)")).toHaveValue("1500");
    expect(screen.getByLabelText("Stock")).toHaveValue(12);
    expect(screen.getByLabelText("Posición en listados")).toHaveValue(0);
    expect(screen.getByLabelText("Precio de oferta ($)")).toHaveValue("1200,50");
    expect(screen.getByRole("radio", { name: "Activo" })).toBeChecked();
    expect(screen.getByRole("heading", { level: 1, name: "Cuaderno rayado" })).toBeInTheDocument();
    const header = screen.getByRole("heading", { level: 1 }).closest("header")!;
    expect(header).toHaveTextContent("LMS-000001");
    expect(header).toHaveTextContent("/cuaderno-rayado");
    expect(screen.queryByRole("textbox", { name: "SKU" })).not.toBeInTheDocument();
  });

  it("shows who created and last changed the product", async () => {
    givenProduct();
    renderEdit();

    const record = await screen.findByRole("region", { name: "Registro" });
    expect(record).toHaveTextContent("LMS-000001");
    expect(record).toHaveTextContent("2 de enero de 2026 · Marta");
    expect(record).toHaveTextContent("Lucía");
  });

  it("has nothing to save until something changes", async () => {
    givenProduct();
    renderEdit();

    await screen.findByLabelText("Título");
    expect(screen.getByText("Sin cambios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("sends only what changed, tells it and goes back to the list", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    const stock = await screen.findByLabelText("Stock");
    await person.clear(stock);
    await person.type(stock, "3");
    expect(screen.getByText("Hay cambios sin guardar")).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(adminProductsApi.update).toHaveBeenCalledWith("p1", { stock: 3 }));
    expect(toast.success).toHaveBeenCalledWith("Cambios guardados");
    expect(push).toHaveBeenCalledWith("/admin/productos");
  });

  it("marks a field that is not valid and does not send", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    const title = await screen.findByLabelText("Título");
    await person.clear(title);
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Escribí el título.")).toBeInTheDocument();
    expect(title).toBeInvalid();
    expect(title).toHaveFocus();
    expect(adminProductsApi.update).not.toHaveBeenCalled();
  });

  it("tells a field's problem when leaving it, before saving", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    const price = await screen.findByLabelText("Precio ($)");
    await person.clear(price);
    await person.type(price, "abc");
    await person.tab();

    expect(
      await screen.findByText("Escribí un precio válido, como 1500 o 1500,50."),
    ).toBeInTheDocument();
  });

  it("shows the server's refusal next to the field and keeps what was typed", async () => {
    givenProduct();
    vi.mocked(adminProductsApi.update).mockRejectedValue(
      new ApiError({
        status: 400,
        code: "VALIDATION_FAILED",
        message: "Revisá los datos.",
        details: [{ field: "title", messages: ["Ya hay un producto con ese título."] }],
      }),
    );
    const person = userEvent.setup();
    renderEdit();

    const title = await screen.findByLabelText("Título");
    await person.clear(title);
    await person.type(title, "Otro título");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Ya hay un producto con ese título.")).toBeInTheDocument();
    expect(title).toHaveValue("Otro título");
    expect(title).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a failure that belongs to no field in an alert above the form", async () => {
    givenProduct();
    vi.mocked(adminProductsApi.update).mockRejectedValue(
      new ApiError({ status: 502, code: "IMAGE_UPLOAD_FAILED", message: "Falló la subida." }),
    );
    const person = userEvent.setup();
    renderEdit();

    const stock = await screen.findByLabelText("Stock");
    await person.clear(stock);
    await person.type(stock, "1");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Falló la subida.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("alert").some((alert) => alert.textContent === "Falló la subida."),
    ).toBe(true);
  });

  it("asks before leaving with changes, and not otherwise", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    expect(await screen.findByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/productos",
    );
    await person.type(screen.getByLabelText("Stock"), "1");
    await person.click(screen.getByRole("button", { name: "Cancelar" }));

    const dialog = await screen.findByRole("alertdialog", { name: "¿Salir sin guardar?" });
    await person.click(within(dialog).getByRole("button", { name: "Seguir editando" }));
    expect(push).not.toHaveBeenCalled();
    await person.click(screen.getByRole("button", { name: "Cancelar" }));
    await person.click(await screen.findByRole("button", { name: "Salir" }));
    expect(push).toHaveBeenCalledWith("/admin/productos");
  });
});

describe("EditProductPage offer, new mark and state", () => {
  it("shows the offer's fields only while the offer is on, with the discount", async () => {
    givenProduct({ price: "1000.00" });
    const person = userEvent.setup();
    renderEdit();

    await screen.findByLabelText("Título");
    expect(screen.queryByLabelText("Precio de oferta ($)")).not.toBeInTheDocument();
    await person.click(screen.getByRole("switch", { name: "Oferta" }));
    await person.type(screen.getByLabelText("Precio de oferta ($)"), "800");

    expect(screen.getByText("20% de descuento")).toBeInTheDocument();
    expect(screen.getByLabelText("Termina el (opcional)")).toBeInTheDocument();
    await person.click(screen.getByRole("switch", { name: "Oferta" }));
    expect(screen.queryByLabelText("Precio de oferta ($)")).not.toBeInTheDocument();
  });

  it("asks for an offer price lower than the price", async () => {
    givenProduct({ price: "1000.00" });
    const person = userEvent.setup();
    renderEdit();

    await screen.findByLabelText("Título");
    await person.click(screen.getByRole("switch", { name: "Oferta" }));
    await person.type(screen.getByLabelText("Precio de oferta ($)"), "1200");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("El precio de oferta tiene que ser menor que el precio."),
    ).toBeInTheDocument();
    expect(adminProductsApi.update).not.toHaveBeenCalled();
  });

  it("sends the offer with its end as the last minute of the day", async () => {
    givenProduct({ price: "1000.00" });
    const person = userEvent.setup();
    renderEdit();

    await screen.findByLabelText("Título");
    await person.click(screen.getByRole("switch", { name: "Oferta" }));
    await person.type(screen.getByLabelText("Precio de oferta ($)"), "800,5");
    await person.type(screen.getByLabelText("Termina el (opcional)"), "2099-12-31");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(adminProductsApi.update).toHaveBeenCalled());
    const [, changes] = vi.mocked(adminProductsApi.update).mock.calls[0];
    expect(changes).toMatchObject({ isOnSale: true, salePrice: "800.50" });
    expect(changes.saleEndsAt).toMatch(/^2099-12-31T23:59:00[+-]\d{2}:\d{2}$/);
  });

  it("sends only that the offer is off, when it is turned off", async () => {
    givenProduct({ price: "1000.00", salePrice: "800.00", isOnSale: true });
    const person = userEvent.setup();
    renderEdit();

    await person.click(await screen.findByRole("switch", { name: "Oferta" }));
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminProductsApi.update).toHaveBeenCalledWith("p1", { isOnSale: false }),
    );
  });

  it("shows the day of a novelty only while the mark is on, and refuses a past day", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    await screen.findByLabelText("Título");
    expect(screen.queryByLabelText("Es novedad hasta (opcional)")).not.toBeInTheDocument();
    await person.click(screen.getByRole("switch", { name: "Nuevo" }));
    await person.type(screen.getByLabelText("Es novedad hasta (opcional)"), "2020-01-01");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("El día no puede ser anterior a hoy.")).toBeInTheDocument();
    expect(adminProductsApi.update).not.toHaveBeenCalled();
  });

  it("sends the state, the featured mark and the position when they change", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    await person.click(await screen.findByRole("radio", { name: "Inactivo" }));
    await person.click(screen.getByRole("switch", { name: "Destacado" }));
    const position = screen.getByLabelText("Posición en listados");
    await person.clear(position);
    await person.type(position, "4");
    await person.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(adminProductsApi.update).toHaveBeenCalledWith("p1", {
        isActive: false,
        isFeatured: true,
        sortOrder: 4,
      }),
    );
  });

  it("toggles a switch with the keyboard", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    const featured = await screen.findByRole("switch", { name: "Destacado" });
    featured.focus();
    await person.keyboard(" ");

    expect(featured).toBeChecked();
  });
});

describe("EditProductPage actions and deleted products", () => {
  it("gives the product a logical delete from the header, after asking", async () => {
    givenProduct();
    const person = userEvent.setup();
    renderEdit();

    await person.click(await screen.findByRole("button", { name: "Dar de baja" }));
    await person.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Dar de baja" }),
    );

    await waitFor(() => expect(adminProductsApi.remove).toHaveBeenCalledWith("p1"));
  });

  it("shows a deleted product read-only, with the way to bring it back", async () => {
    givenProduct({ deletedAt: new Date("2026-11-05T12:00:00.000Z") });
    const person = userEvent.setup();
    renderEdit();

    const notice = (await screen.findByText(/dado de baja desde/)).closest(
      "[role=status]",
    ) as HTMLElement;
    expect(notice).toHaveTextContent("dado de baja desde el 5 de noviembre de 2026");
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Título").closest("[inert]")).not.toBeNull();

    await person.click(within(notice).getByRole("button", { name: "Reactivar" }));
    await waitFor(() => expect(adminProductsApi.restore).toHaveBeenCalledWith("p1"));
  });
});

describe("NewProductPage", () => {
  it("shows an empty form with no SKU nor record", () => {
    renderNew();

    expect(screen.getByRole("heading", { level: 1, name: "Nuevo producto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(screen.getByLabelText("Posición en listados")).toHaveValue(0);
    expect(screen.getByRole("radio", { name: "Activo" })).toBeChecked();
    expect(screen.getByText(/los genera el sistema al guardar/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Registro" })).not.toBeInTheDocument();
    expect(screen.getByText("Completá los datos y sumá al menos una imagen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear producto" })).toBeEnabled();
  });

  it("marks what is missing and sends nothing, with the first problem focused", async () => {
    const person = userEvent.setup();
    renderNew();

    await person.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByText("Escribí el título.")).toBeInTheDocument();
    expect(screen.getByText("Escribí el precio.")).toBeInTheDocument();
    expect(
      screen.getByText("Escribí el stock como un número entero, 0 o más."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveFocus();
    expect(adminProductsApi.create).not.toHaveBeenCalled();
  });

  it("asks before leaving once something was typed", async () => {
    const person = userEvent.setup();
    renderNew();

    expect(screen.getByRole("link", { name: "Cancelar" })).toBeInTheDocument();
    await person.type(screen.getByLabelText("Título"), "Cuaderno");

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
