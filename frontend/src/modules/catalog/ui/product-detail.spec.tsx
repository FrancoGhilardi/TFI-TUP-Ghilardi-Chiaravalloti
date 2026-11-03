import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCartStore } from "@/modules/cart/application/cart-store";

import { getProductPage } from "../application/get-product-page";
import type { ProductCard } from "../domain/product-card";
import type { ProductDetail } from "../domain/product-detail";
import { ProductDetailPage } from "./ProductDetailPage";
import { ProductErrorState } from "./ProductErrorState";
import { ProductGallery } from "./ProductGallery";
import { ProductNotFoundState } from "./ProductNotFoundState";
import { ProductPrice } from "./ProductPrice";
import { StockPill } from "./StockPill";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("../application/get-product-page", () => ({ getProductPage: vi.fn() }));

const STORAGE = "http://127.0.0.1:54321/storage/v1/object/public/product-images";

const image = (id: string) => ({
  id,
  url: `${STORAGE}/${id}.webp`,
  alt: `Foto ${id}`,
  optimizable: true,
});

const related = (slug: string): ProductCard => ({
  id: slug,
  slug,
  title: `Similar ${slug}`,
  price: "450.00",
  salePrice: null,
  isOnSale: false,
  isNew: false,
  isFeatured: false,
  image: { url: `${STORAGE}/${slug}.webp`, alt: slug, optimizable: true },
  category: null,
});

const product = (overrides: Partial<ProductDetail> = {}): ProductDetail => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  description: "Tapa dura.\nHojas rayadas.",
  price: "9800.00",
  salePrice: null,
  isOnSale: false,
  stock: 10,
  images: [image("i1"), image("i2")],
  category: { name: "Cuadernos", slug: "cuadernos" },
  related: [related("lapiz"), related("goma")],
  ...overrides,
});

const renderPage = async (detail: ProductDetail) => {
  vi.mocked(getProductPage).mockResolvedValue({ status: "ok", product: detail });
  render(await ProductDetailPage({ slug: detail.slug }));
};

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], syncNotice: null });
  vi.mocked(notFound).mockClear();
});

describe("ProductPrice", () => {
  it("shows only the price without a running sale", () => {
    const { container } = render(
      <ProductPrice price="9800.00" salePrice={null} isOnSale={false} />,
    );

    expect(container).toHaveTextContent(/^\$\s9\.800$/);
    expect(container.querySelector("del")).toBeNull();
  });

  it("shows the sale price with the regular one struck through", () => {
    const { container } = render(
      <ProductPrice price="9800.00" salePrice="8000.00" isOnSale size="detail" />,
    );

    expect(container.querySelector("span.font-bold")).toHaveTextContent(/^\$\s8\.000$/);
    const previous = container.querySelector("del");
    expect(previous).toHaveTextContent(/Precio anterior:\s*\$\s9\.800/);
  });

  it("does not strike anything when the sale flag has no price behind it", () => {
    const { container } = render(<ProductPrice price="9800.00" salePrice={null} isOnSale />);

    expect(container.querySelector("del")).toBeNull();
  });
});

describe("StockPill", () => {
  it.each([
    [0, "Sin stock"],
    [1, "¡Última unidad!"],
    [4, "¡Últimas 4 unidades!"],
    [6, "¡Últimas 6 unidades!"],
    [7, "7 en stock"],
    [250, "250 en stock"],
  ])("says %i units as %s", (stock, text) => {
    render(<StockPill stock={stock} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });
});

describe("ProductGallery", () => {
  it("shows the first photo large and a thumbnail for each, marking the chosen one", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={[image("i1"), image("i2"), image("i3")]} />);

    expect(screen.getByRole("img", { name: "Foto i1" })).toBeInTheDocument();
    const first = screen.getByRole("button", { name: "Ver foto 1 de 3" });
    expect(first).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Ver foto 3 de 3" }));

    expect(screen.getByRole("img", { name: "Foto i3" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Foto i1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver foto 3 de 3" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(first).not.toHaveAttribute("aria-current");
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={[image("i1"), image("i2")]} />);

    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("img", { name: "Foto i2" })).toBeInTheDocument();
  });

  it("loads only the first photo with priority", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductGallery images={[image("i1"), image("i2")]} />);
    const main = () => container.querySelector("img[alt='Foto i1'], img[alt='Foto i2']");
    // A priority image is loaded eagerly; any other one is lazy.
    expect(main()?.getAttribute("loading")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ver foto 2 de 2" }));

    expect(main()?.getAttribute("loading")).toBe("lazy");
  });

  it("shows no thumbnails for a single photo", () => {
    render(<ProductGallery images={[image("i1")]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ProductDetailPage", () => {
  it("shows the title, category, description, breadcrumb and the related products", async () => {
    await renderPage(product());

    expect(screen.getByRole("heading", { level: 1, name: "Cuaderno A4" })).toBeInTheDocument();
    expect(
      screen.getByText("Tapa dura. Hojas rayadas.", { normalizer: (t) => t.replace(/\s+/g, " ") }),
    ).toBeInTheDocument();
    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(crumbs).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(within(crumbs).getByRole("link", { name: "Cuadernos" })).toHaveAttribute(
      "href",
      "/productos?categoria=cuadernos",
    );
    expect(within(crumbs).getByText("Cuaderno A4")).toHaveAttribute("aria-current", "page");
    const similar = screen.getByRole("region", { name: "Productos similares" });
    expect(within(similar).getAllByRole("article")).toHaveLength(2);
    expect(within(similar).getByRole("link", { name: "Similar lapiz" })).toHaveAttribute(
      "href",
      "/productos/lapiz",
    );
  });

  it("shows the sale price struck-through with the Oferta badge during a running sale", async () => {
    await renderPage(product({ isOnSale: true, salePrice: "8000.00" }));

    expect(screen.getByText("Oferta")).toBeInTheDocument();
    expect(document.querySelector("del")).toHaveTextContent(/\$\s9\.800/);
  });

  it("shows no badge and no struck price without a sale", async () => {
    await renderPage(product());

    expect(screen.queryByText("Oferta")).not.toBeInTheDocument();
    expect(document.querySelector("del")).toBeNull();
  });

  it("omits the description, the category eyebrow and the related section when there are none", async () => {
    await renderPage(product({ description: null, category: null, related: [] }));

    expect(screen.queryByText("Tapa dura.")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Productos similares" })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Migas de pan" })).getByRole("link", {
        name: "Productos",
      }),
    ).toHaveAttribute("href", "/productos");
  });

  it("adds to the cart with the sale price as the current one", async () => {
    const user = userEvent.setup();
    await renderPage(product({ isOnSale: true, salePrice: "8000.00", stock: 5 }));

    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    expect(useCartStore.getState().items).toEqual([
      {
        id: "p1",
        slug: "cuaderno-a4",
        title: "Cuaderno A4",
        price: "8000.00",
        stock: 5,
        imageUrl: `${STORAGE}/i1.webp`,
        quantity: 1,
      },
    ]);
  });

  it("disables adding when there is no stock but still offers the WhatsApp inquiry", async () => {
    await renderPage(product({ stock: 0 }));

    expect(screen.getByRole("button", { name: "Sin stock" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Consultar" })).toBeInTheDocument();
  });

  it("links the WhatsApp inquiry with the title, the current price and the page address", async () => {
    await renderPage(product({ isOnSale: true, salePrice: "8000.00" }));

    const link = screen.getByRole("link", { name: "Consultar" });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.origin + url.pathname).toBe("https://wa.me/5492622380159");
    expect(url.searchParams.get("text")).toContain("«Cuaderno A4»");
    expect(url.searchParams.get("text")).toMatch(/\$\s8\.000/);
    expect(url.searchParams.get("text")).toContain("http://localhost:3000/productos/cuaderno-a4");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("refreshes a product already in the cart as it opens, and tells about a lowered quantity", async () => {
    useCartStore.getState().add(
      {
        id: "p1",
        slug: "cuaderno-a4",
        title: "Cuaderno A4",
        price: "9800.00",
        stock: 9,
        imageUrl: `${STORAGE}/i1.webp`,
      },
      5,
    );

    await renderPage(product({ stock: 2 }));

    expect(
      screen.getByText(
        /Ajustamos la cantidad de «Cuaderno A4» en tu carrito al stock disponible: 2/,
      ),
    ).toBeInTheDocument();
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("starts from the first photo and a quantity of one when the visitor goes to another product", async () => {
    const user = userEvent.setup();
    vi.mocked(getProductPage).mockResolvedValue({ status: "ok", product: product() });
    const { rerender } = render(await ProductDetailPage({ slug: "cuaderno-a4" }));
    await user.click(screen.getByRole("button", { name: "Ver foto 2 de 2" }));
    await user.click(screen.getByRole("button", { name: "Sumar uno" }));
    expect(screen.getByRole("img", { name: "Foto i2" })).toBeInTheDocument();

    const other = product({
      id: "p9",
      slug: "lapiz",
      title: "Lápiz",
      images: [image("j1"), image("j2")],
    });
    vi.mocked(getProductPage).mockResolvedValue({ status: "ok", product: other });
    rerender(await ProductDetailPage({ slug: "lapiz" }));

    expect(screen.getByRole("img", { name: "Foto j1" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Cantidad" })).toHaveTextContent("1");
  });

  it("calls notFound for a product the API does not have", async () => {
    vi.mocked(getProductPage).mockResolvedValue({ status: "not-found" });

    await expect(ProductDetailPage({ slug: "no-existe" })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledOnce();
  });
});

describe("ProductNotFoundState", () => {
  it("says the product is not there and leads to the catalog", () => {
    render(<ProductNotFoundState />);

    expect(
      screen.getByRole("heading", { name: "No encontramos este producto" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos los productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });
});

describe("ProductErrorState", () => {
  it("announces the failure, retries on demand and leads to the catalog", async () => {
    const reset = vi.fn();
    render(<ProductErrorState reset={reset} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar el producto");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Ver todos los productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });
});
