import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoryOptions } from "@/modules/admin-categories";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import type { AdminProductDetail, AdminProductImage } from "../domain/admin-product";
import { adminProductImagesApi as images } from "../infrastructure/admin-product-images-client";
import { adminProductsApi } from "../infrastructure/admin-products-client";
import { EditProductPage } from "./EditProductPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/modules/admin-categories", () => ({ useCategoryOptions: vi.fn() }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-products-client", () => ({
  adminProductsApi: {
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
    list: vi.fn(),
  },
}));
vi.mock("../infrastructure/admin-product-images-client", () => ({
  adminProductImagesApi: {
    list: vi.fn(),
    add: vi.fn(),
    reorder: vi.fn(),
    changeAltText: vi.fn(),
    replaceFile: vi.fn(),
    retry: vi.fn(),
    remove: vi.fn(),
  },
}));

const image = (
  id: string,
  position: number,
  overrides: Partial<AdminProductImage> = {},
): AdminProductImage => ({
  id,
  position,
  altText: null,
  mimeType: "image/png",
  sizeBytes: 100,
  status: "PROCESSED",
  previewUrl: `https://storage.test/${id}`,
  ...overrides,
});

const product = (overrides: Partial<AdminProductDetail> = {}): AdminProductDetail => ({
  id: "p1",
  sku: "LMS-000001",
  slug: "cuaderno",
  title: "Cuaderno",
  description: null,
  price: "1500.00",
  salePrice: null,
  saleEndsAt: null,
  stock: 1,
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

const given = (list: AdminProductImage[], detail: Partial<AdminProductDetail> = {}) => {
  vi.mocked(adminProductsApi.get).mockResolvedValue(product(detail));
  vi.mocked(images.list).mockResolvedValue(list);
};

const renderPage = () => {
  const person = userEvent.setup({ applyAccept: false, advanceTimers: vi.advanceTimersByTime });
  const view = render(
    <QueryProvider>
      <EditProductPage id="p1" />
    </QueryProvider>,
  );
  return { person, container: view.container };
};

const rows = () =>
  within(screen.getByRole("list", { name: "Imágenes del producto" })).getAllByRole("listitem");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  for (const call of Object.values(images)) {
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

afterEach(() => {
  vi.useRealTimers();
});

describe("saved images", () => {
  it("lists the images by position with their state and how many there are", async () => {
    given([
      image("i1", 1),
      image("i2", 2, { status: "PENDING" }),
      image("i3", 3, { status: "FAILED" }),
    ]);
    renderPage();

    await screen.findByRole("list", { name: "Imágenes del producto" });
    const [first, second, third] = rows();
    expect(first).toHaveTextContent("Portada");
    expect(first).toHaveTextContent("Lista");
    expect(second).toHaveTextContent("Imagen 2");
    expect(second).toHaveTextContent("Procesando…");
    expect(third).toHaveTextContent("No se pudo procesar");
    expect(within(third).getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.getByText("3 de 5")).toBeInTheDocument();
  });

  it("says when the images are loading and when they could not load, and tries again", async () => {
    given([image("i1", 1)]);
    vi.mocked(images.list).mockRejectedValueOnce(new Error("boom"));
    const { person } = renderPage();

    expect(await screen.findByText("No pudimos cargar las imágenes.")).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("list", { name: "Imágenes del producto" })).toBeInTheDocument();
  });

  it("adds an image right away, tells it and reads the list again", async () => {
    given([image("i1", 1)]);
    const { person, container } = renderPage();
    await screen.findByRole("list", { name: "Imágenes del producto" });
    const file = new File(["x"], "nueva.png", { type: "image/png" });

    await person.upload(container.querySelector<HTMLInputElement>("input[type=file]")!, file);

    await waitFor(() => expect(images.add).toHaveBeenCalledWith("p1", file, ""));
    expect(toast.success).toHaveBeenCalledWith("Imagen agregada");
    await waitFor(() => expect(images.list).toHaveBeenCalledTimes(2));
  });

  it("does not send a file that is not an image of the three types, and says why", async () => {
    given([image("i1", 1)]);
    const { person, container } = renderPage();
    await screen.findByRole("list", { name: "Imágenes del producto" });

    await person.upload(
      container.querySelector<HTMLInputElement>("input[type=file]")!,
      new File(["x"], "documento.pdf", { type: "application/pdf" }),
    );

    expect(
      await screen.findByText("documento.pdf: usá una imagen JPEG, PNG o WebP."),
    ).toBeInTheDocument();
    expect(images.add).not.toHaveBeenCalled();
  });

  it("stops offering to add when there are five", async () => {
    given(Array.from({ length: 5 }, (_, index) => image(`i${index}`, index + 1)));
    renderPage();

    await screen.findByRole("list", { name: "Imágenes del producto" });

    expect(screen.getByRole("button", { name: "Agregar imágenes" })).toBeDisabled();
  });

  it("reorders with the buttons, sending every image in the new order", async () => {
    given([image("i1", 1), image("i2", 2), image("i3", 3)]);
    const { person } = renderPage();

    await person.click(await screen.findByRole("button", { name: "Subir imagen 3" }));

    await waitFor(() => expect(images.reorder).toHaveBeenCalledWith("p1", ["i1", "i3", "i2"]));
    expect(toast.success).toHaveBeenCalledWith("Orden de las imágenes actualizado");
    expect(screen.getByRole("button", { name: "Subir imagen 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar imagen 3" })).toBeDisabled();
  });

  it("gives every image a handle to drag it", async () => {
    given([image("i1", 1), image("i2", 2)]);
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Arrastrar imagen 2 para ordenarla" }),
    ).toHaveAttribute("aria-roledescription", "sortable");
  });

  it("saves the alternative text of an image only once it changed", async () => {
    given([image("i1", 1, { altText: "Tapa" }), image("i2", 2)]);
    const { person } = renderPage();

    const field = (await screen.findAllByLabelText("Texto alternativo (opcional)"))[0];
    const save = within(rows()[0]).getByRole("button", { name: "Guardar texto" });
    expect(field).toHaveValue("Tapa");
    expect(save).toBeDisabled();
    await person.clear(field);
    await person.type(field, "Tapa dura");
    await person.click(save);

    await waitFor(() => expect(images.changeAltText).toHaveBeenCalledWith("p1", "i1", "Tapa dura"));
    expect(toast.success).toHaveBeenCalledWith("Texto alternativo guardado");
  });

  it("takes an alternative text away by saving an empty one", async () => {
    given([image("i1", 1, { altText: "Tapa" }), image("i2", 2)]);
    const { person } = renderPage();

    await person.clear((await screen.findAllByLabelText("Texto alternativo (opcional)"))[0]);
    await person.click(within(rows()[0]).getByRole("button", { name: "Guardar texto" }));

    await waitFor(() => expect(images.changeAltText).toHaveBeenCalledWith("p1", "i1", ""));
  });

  it("replaces the file of an image", async () => {
    given([image("i1", 1), image("i2", 2)]);
    const { person } = renderPage();
    await screen.findByRole("list", { name: "Imágenes del producto" });
    const file = new File(["x"], "otra.webp", { type: "image/webp" });

    const input = rows()[1].querySelector<HTMLInputElement>("input[type=file]")!;
    await person.upload(input, file);

    await waitFor(() => expect(images.replaceFile).toHaveBeenCalledWith("p1", "i2", file));
    expect(toast.success).toHaveBeenCalledWith("Imagen reemplazada: se está procesando");
  });

  it("asks before taking an image off, and does it once confirmed", async () => {
    given([image("i1", 1), image("i2", 2)]);
    const { person } = renderPage();

    await person.click(await screen.findByRole("button", { name: "Quitar imagen 2" }));
    const dialog = await screen.findByRole("alertdialog", { name: "¿Quitar la imagen 2?" });
    await person.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(images.remove).not.toHaveBeenCalled();
    await person.click(screen.getByRole("button", { name: "Quitar imagen 2" }));
    await person.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Quitar imagen" }),
    );

    await waitFor(() => expect(images.remove).toHaveBeenCalledWith("p1", "i2"));
    expect(toast.success).toHaveBeenCalledWith("Imagen eliminada");
  });

  it("does not let the last image be taken off, and says why", async () => {
    given([image("i1", 1)]);
    renderPage();

    expect(await screen.findByRole("button", { name: "Quitar imagen 1" })).toBeDisabled();
    expect(screen.getByText(/necesita al menos una imagen/)).toBeInTheDocument();
  });

  it("shows the API's refusal as a message and keeps the image", async () => {
    given([image("i1", 1), image("i2", 2)]);
    vi.mocked(images.remove).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "LAST_PRODUCT_IMAGE",
        message: "Necesita al menos una imagen.",
      }),
    );
    const { person } = renderPage();

    await person.click(await screen.findByRole("button", { name: "Quitar imagen 2" }));
    await person.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Quitar imagen" }),
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Necesita al menos una imagen."));
    expect(rows()).toHaveLength(2);
  });

  it("tries again to process an image that failed", async () => {
    given([image("i1", 1, { status: "FAILED" }), image("i2", 2)]);
    const { person } = renderPage();

    await person.click(await screen.findByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(images.retry).toHaveBeenCalledWith("p1", "i1"));
    expect(toast.success).toHaveBeenCalledWith("Volvemos a procesar la imagen");
  });

  it("reads the images again while one is processing, until it is ready", async () => {
    vi.mocked(adminProductsApi.get).mockResolvedValue(product());
    vi.mocked(images.list)
      .mockResolvedValueOnce([image("i1", 1, { status: "PENDING" })])
      .mockResolvedValue([image("i1", 1)]);
    renderPage();

    expect(await screen.findByText("Procesando…")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(await screen.findByText("Lista")).toBeInTheDocument();
    expect(screen.queryByText("Procesando…")).not.toBeInTheDocument();
  });

  it("shows them without actions to reach in a deleted product", async () => {
    given([image("i1", 1)], { deletedAt: new Date("2026-11-05T12:00:00.000Z") });
    renderPage();

    const list = await screen.findByRole("list", { name: "Imágenes del producto" });

    expect(list.closest("[inert]")).not.toBeNull();
  });

  it("saves the alternative text with Enter, without sending the product's form", async () => {
    given([image("i1", 1, { altText: "Tapa" }), image("i2", 2)]);
    const { person } = renderPage();

    const field = (await screen.findAllByLabelText("Texto alternativo (opcional)"))[0];
    await person.clear(field);
    await person.type(field, "Tapa dura{Enter}");

    await waitFor(() => expect(images.changeAltText).toHaveBeenCalledWith("p1", "i1", "Tapa dura"));
    expect(adminProductsApi.update).not.toHaveBeenCalled();
  });

  it("does not let the order change while some image has a request on its way", async () => {
    given([image("i1", 1), image("i2", 2), image("i3", 3)]);
    vi.mocked(images.retry).mockReturnValue(new Promise(() => {}));
    vi.mocked(images.list).mockResolvedValue([
      image("i1", 1, { status: "FAILED" }),
      image("i2", 2),
      image("i3", 3),
    ]);
    const { person } = renderPage();

    await person.click(await screen.findByRole("button", { name: "Reintentar" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Subir imagen 3" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Bajar imagen 2" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Arrastrar imagen 3 para ordenarla" }),
    ).toBeDisabled();
    expect(images.reorder).not.toHaveBeenCalled();
  });
});
