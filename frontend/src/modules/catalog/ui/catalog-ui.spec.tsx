import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CategoryNode } from "../domain/category";
import type { ProductCard } from "../domain/product-card";
import { CategoryGrid } from "./CategoryGrid";
import { ProductCardItem } from "./ProductCardItem";
import { ProductGrid } from "./ProductGrid";

const product = (overrides: Partial<ProductCard> = {}): ProductCard => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  salePrice: null,
  stock: 5,
  isOnSale: false,
  isNew: false,
  isFeatured: false,
  image: {
    url: "http://127.0.0.1:54321/storage/v1/object/public/product-images/p1.webp",
    alt: "Tapa del cuaderno",
    optimizable: true,
  },
  category: { name: "Cuadernos", slug: "cuadernos" },
  ...overrides,
});

describe("ProductCardItem", () => {
  it("links the whole card to the product page with the title as its name", () => {
    render(<ProductCardItem imageSizes="50vw" product={product()} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Cuaderno A4");
    expect(links[0]).toHaveAttribute("href", "/productos/cuaderno-a4");
  });

  it("shows the image with its text alternative, the category and the price", () => {
    render(<ProductCardItem imageSizes="50vw" product={product()} />);

    expect(screen.getByRole("img", { name: "Tapa del cuaderno" })).toBeInTheDocument();
    expect(screen.getByText("Cuadernos")).toBeInTheDocument();
    expect(screen.getByText(/^\$\s9\.800$/)).toBeInTheDocument();
  });

  it("leaves out a hidden category", () => {
    render(<ProductCardItem imageSizes="50vw" product={product({ category: null })} />);

    expect(screen.queryByText("Cuadernos")).not.toBeInTheDocument();
  });

  it("shows a badge per mark", () => {
    render(
      <ProductCardItem
        imageSizes="50vw"
        product={product({ isFeatured: true, isNew: true, isOnSale: true, salePrice: "8000.00" })}
      />,
    );

    const badges = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(badges.map((badge) => badge.textContent)).toEqual(["Destacado", "Nuevo", "Oferta"]);
  });

  it("announces a sale only when the sale price is shown", () => {
    render(
      <ProductCardItem imageSizes="50vw" product={product({ isOnSale: true, salePrice: null })} />,
    );

    expect(screen.queryByText("Oferta")).not.toBeInTheDocument();
  });

  it("sends a Storage image through the optimizer and any other one as is", () => {
    const foreign = "https://cdn.example.com/p1.webp";
    render(
      <>
        <ProductCardItem imageSizes="50vw" product={product()} />
        <ProductCardItem
          imageSizes="50vw"
          product={product({
            id: "p2",
            title: "Lápiz",
            image: { url: foreign, alt: "Lápiz", optimizable: false },
          })}
        />
      </>,
    );

    expect(screen.getByRole("img", { name: "Tapa del cuaderno" }).getAttribute("src")).toMatch(
      /^\/_next\/image\?url=/,
    );
    expect(screen.getByRole("img", { name: "Lápiz" })).toHaveAttribute("src", foreign);
  });

  it("shows no badges without marks", () => {
    render(<ProductCardItem imageSizes="50vw" product={product()} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the sale price and strikes the regular one", () => {
    render(
      <ProductCardItem
        imageSizes="50vw"
        product={product({ isOnSale: true, salePrice: "8000.00" })}
      />,
    );

    expect(screen.getByText(/^\$\s8\.000$/)).toBeInTheDocument();
    const regular = screen.getByText(/^\$\s9\.800$/);
    expect(regular.closest("del")).toHaveTextContent(/^Precio anterior: \$\s9\.800$/);
  });

  it("renders the action it is given", () => {
    render(
      <ProductCardItem
        imageSizes="50vw"
        product={product()}
        action={<button type="button">Agregar</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
  });
});

describe("ProductGrid", () => {
  it("renders a card per product, with the action of each", () => {
    const products = [product(), product({ id: "p2", slug: "lapiz", title: "Lápiz" })];

    render(
      <ProductGrid
        products={products}
        layout="catalog"
        renderAction={(item) => <button type="button">Agregar {item.title}</button>}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Agregar Lápiz" })).toBeInTheDocument();
  });
});

describe("CategoryGrid", () => {
  it("links each category to the filtered catalog", () => {
    const categories: CategoryNode[] = [
      { id: "c1", name: "Libros", slug: "libros", description: null, children: [] },
      { id: "c2", name: "Impresiones", slug: "impresiones", description: null, children: [] },
    ];

    render(<CategoryGrid categories={categories} />);

    expect(screen.getByRole("link", { name: "Libros" })).toHaveAttribute(
      "href",
      "/productos?categoria=libros",
    );
    expect(screen.getByRole("link", { name: "Impresiones" })).toHaveAttribute(
      "href",
      "/productos?categoria=impresiones",
    );
  });
});
