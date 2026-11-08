import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoryOptions } from "@/modules/admin-categories";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { adminProductsApi } from "../infrastructure/admin-products-client";
import { NewProductPage } from "./NewProductPage";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/modules/admin-categories", () => ({ useCategoryOptions: vi.fn() }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-products-client", () => ({
  adminProductsApi: { create: vi.fn(), list: vi.fn() },
}));

const png = (name: string) => new File([name], name, { type: "image/png" });

const renderPage = () => {
  const person = userEvent.setup({ applyAccept: false });
  const view = render(
    <QueryProvider>
      <NewProductPage />
    </QueryProvider>,
  );
  const upload = (...files: File[]) =>
    person.upload(view.container.querySelector<HTMLInputElement>("input[type=file]")!, files);
  return { person, upload };
};

const rows = () =>
  within(screen.getByRole("list", { name: "Imágenes del producto" })).getAllByRole("listitem");

beforeEach(() => {
  push.mockReset();
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
  URL.revokeObjectURL = vi.fn();
  vi.mocked(adminProductsApi.create).mockReset();
  vi.mocked(adminProductsApi.create).mockResolvedValue(undefined);
  vi.mocked(useCategoryOptions).mockReturnValue({
    data: [{ id: "c1", label: "Cuadernos", isActive: true }],
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useCategoryOptions>);
});

describe("images when creating a product", () => {
  it("starts with none and accepts the three types, from the gallery or the camera of a phone", () => {
    renderPage();

    expect(screen.getByText("Todavía no sumaste ninguna imagen.")).toBeInTheDocument();
    expect(screen.getByText("0 de 5")).toBeInTheDocument();
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(input).toHaveAttribute("multiple");
  });

  it("shows each image picked, the first as the cover", async () => {
    const { upload } = renderPage();

    await upload(png("tapa.png"), png("lomo.png"));

    const [first, second] = rows();
    expect(first).toHaveTextContent("tapa.png");
    expect(first).toHaveTextContent("Portada");
    expect(second).toHaveTextContent("lomo.png");
    expect(second).toHaveTextContent("Imagen 2");
    expect(screen.getByText("2 de 5")).toBeInTheDocument();
  });

  it("leaves out what is not an image of those types or is too big, and says why", async () => {
    const { upload } = renderPage();
    const gif = new File(["x"], "animada.gif", { type: "image/gif" });
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "enorme.png", {
      type: "image/png",
    });

    await upload(gif, big, png("buena.png"));

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("buena.png");
    const alert = screen.getByText("animada.gif: usá una imagen JPEG, PNG o WebP.").closest("ul")!;
    expect(alert).toHaveTextContent("enorme.png: pesa más de 10 MB.");
  });

  it("takes only five, tells that the rest were left out, and stops offering to add more", async () => {
    const { upload } = renderPage();

    await upload(...Array.from({ length: 6 }, (_, index) => png(`foto${index}.png`)));

    expect(rows()).toHaveLength(5);
    expect(screen.getByText(/Podés subir hasta 5 imágenes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar imágenes" })).toBeDisabled();
  });

  it("moves an image up and down with buttons, the cover being the first", async () => {
    const { person, upload } = renderPage();
    await upload(png("a.png"), png("b.png"), png("c.png"));

    expect(screen.getByRole("button", { name: "Subir a.png" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar c.png" })).toBeDisabled();
    await person.click(screen.getByRole("button", { name: "Subir c.png" }));
    await person.click(screen.getByRole("button", { name: "Subir c.png" }));

    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining("c.png"),
      expect.stringContaining("a.png"),
      expect.stringContaining("b.png"),
    ]);
    expect(rows()[0]).toHaveTextContent("Portada");
  });

  it("takes an image off", async () => {
    const { person, upload } = renderPage();
    await upload(png("a.png"), png("b.png"));

    await person.click(screen.getByRole("button", { name: "Quitar a.png" }));

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("b.png");
    expect(rows()[0]).toHaveTextContent("Portada");
  });

  it("gives each image a handle to drag it, named after the image", async () => {
    const { upload } = renderPage();

    await upload(png("a.png"));

    const handle = screen.getByRole("button", { name: "Arrastrar a.png para ordenarla" });
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
  });

  it("refuses an alternative text over 255 characters", async () => {
    const { person, upload } = renderPage();
    await upload(png("a.png"));

    const alt = screen.getByLabelText("Texto alternativo (opcional)");
    await person.click(alt);
    await person.paste("a".repeat(256));
    await person.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(
      await screen.findByText("El texto alternativo puede tener hasta 255 caracteres."),
    ).toBeInTheDocument();
    expect(adminProductsApi.create).not.toHaveBeenCalled();
  });

  it("wants at least one image to create the product", async () => {
    const { person } = renderPage();

    await person.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByText("Sumá al menos una imagen.")).toBeInTheDocument();
  });
});

describe("creating a product with images", () => {
  const complete = async (person: ReturnType<typeof renderPage>["person"]) => {
    await person.type(screen.getByLabelText("Título"), "Cuaderno rayado");
    await person.type(screen.getByLabelText("Precio ($)"), "1500,5");
    await person.type(screen.getByLabelText("Stock"), "10");
    await person.click(screen.getByRole("button", { name: "Elegir categorías" }));
    await person.click(await screen.findByRole("option", { name: /Cuadernos/ }));
    await person.keyboard("{Escape}");
  };

  it("sends the data and the images in the order set, each with its text, and goes back to the list", async () => {
    const { person, upload } = renderPage();
    await complete(person);
    const first = png("tapa.png");
    const second = png("lomo.png");
    await upload(first, second);
    await person.type(screen.getAllByLabelText("Texto alternativo (opcional)")[0], "Tapa dura");
    await person.click(screen.getByRole("button", { name: "Subir lomo.png" }));
    await person.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(adminProductsApi.create).toHaveBeenCalledTimes(1));
    const [request, files] = vi.mocked(adminProductsApi.create).mock.calls[0];
    expect(request).toMatchObject({
      title: "Cuaderno rayado",
      price: "1500.50",
      stock: 10,
      categoryIds: ["c1"],
      primaryCategoryId: "c1",
      imageAltTexts: ["", "Tapa dura"],
    });
    expect(files).toEqual([second, first]);
    expect(push).toHaveBeenCalledWith("/admin/productos");
  });

  it("keeps the images chosen when the upload fails, and says so", async () => {
    vi.mocked(adminProductsApi.create).mockRejectedValue(
      new ApiError({
        status: 502,
        code: "IMAGE_UPLOAD_FAILED",
        message: "No pudimos subir las imágenes.",
      }),
    );
    const { person, upload } = renderPage();
    await complete(person);
    await upload(png("tapa.png"));
    await person.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByText("No pudimos subir las imágenes.")).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("puts the server's complaint about an image next to the images", async () => {
    vi.mocked(adminProductsApi.create).mockRejectedValue(
      new ApiError({
        status: 400,
        code: "INVALID_IMAGE",
        message: "La imagen 1 no es un archivo de imagen válido.",
      }),
    );
    const { person, upload } = renderPage();
    await complete(person);
    await upload(png("tapa.png"));
    await person.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(
      await screen.findByText("La imagen 1 no es un archivo de imagen válido."),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });
});
