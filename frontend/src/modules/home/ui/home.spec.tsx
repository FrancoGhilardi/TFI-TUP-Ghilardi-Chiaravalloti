import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CategoryNode, ProductCard } from "@/modules/catalog";
import { AboutTeaser } from "@/modules/institutional";

import { CategoryShowcase } from "./CategoryShowcase";
import { HeroSearch } from "./HeroSearch";
import { HomeHero } from "./HomeHero";
import { ProductShowcase } from "./ProductShowcase";
import { ServicesStrip } from "./ServicesStrip";

const product: ProductCard = {
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  salePrice: null,
  stock: 5,
  isOnSale: false,
  isNew: false,
  isFeatured: true,
  image: {
    url: "http://127.0.0.1:54321/storage/v1/object/public/product-images/p1.webp",
    alt: "Cuaderno A4",
    optimizable: true,
  },
  category: null,
};

const showcase = (products: ProductCard[]) => (
  <ProductShowcase
    id="destacados"
    eyebrow="Selección de la semana"
    title="Destacados"
    more={{ href: "/productos?destacados=true", label: "Ver todos los destacados" }}
    products={products}
  />
);

describe("HomeHero", () => {
  it("has the page heading, the catalog link and the WhatsApp inquiry", () => {
    render(<HomeHero />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Todo para crear, estudiar y soñar.",
    );
    expect(screen.getByRole("link", { name: "Ver catálogo" })).toHaveAttribute(
      "href",
      "/productos",
    );
    const inquiry = screen.getByRole("link", { name: "Consultar" });
    expect(inquiry.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5492622380159\?text=/);
    expect(inquiry).toHaveAttribute("target", "_blank");
  });

  it("signs the banner with the store's tagline, outside the heading", () => {
    render(<HomeHero />);

    const tagline = screen.getByText("Cerca tuyo, en cada sueño");
    expect(tagline).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).not.toContainElement(tagline);
  });
});

describe("HeroSearch", () => {
  it("sends the search to the catalog as q, without JavaScript", () => {
    render(<HeroSearch />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/productos");
    // GET is the form default, which a browser without JavaScript uses too.
    expect((form as HTMLFormElement).method).toBe("get");
    const input = within(form).getByRole("searchbox", { name: "Buscar productos" });
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveAttribute("minLength", "2");
    expect(input).toHaveAttribute("maxLength", "100");
    // Two characters other than spaces, the same rule the catalog applies after trimming.
    expect(input).toHaveAttribute("pattern", ".*\\S.*\\S.*");
    expect(within(form).getByRole("button", { name: "Buscar" })).toHaveAttribute("type", "submit");
  });
});

describe("ServicesStrip", () => {
  it("lists the store services", () => {
    render(<ServicesStrip />);

    const items = within(screen.getByRole("region", { name: "Servicios" })).getAllByRole(
      "listitem",
    );
    expect(items.map((item) => item.textContent)).toEqual([
      "Impresiones y fotocopias",
      "Anillado y plastificado",
      "Rapipago",
      "Reservá y retirá en el local",
    ]);
  });
});

describe("ProductShowcase", () => {
  it("names the section by its heading and links to the full list", () => {
    render(showcase([product]));

    const section = screen.getByRole("region", { name: "Destacados" });
    expect(within(section).getByRole("link", { name: "Ver todos los destacados" })).toHaveAttribute(
      "href",
      "/productos?destacados=true",
    );
    expect(within(section).getAllByRole("article")).toHaveLength(1);
  });

  it("renders nothing without products", () => {
    const { container } = render(showcase([]));

    expect(container).toBeEmptyDOMElement();
  });
});

describe("CategoryShowcase", () => {
  const libros: CategoryNode = {
    id: "c1",
    name: "Libros",
    slug: "libros",
    description: null,
    children: [],
  };

  it("lists the categories under its heading", () => {
    render(<CategoryShowcase categories={[libros]} />);

    const section = screen.getByRole("region", { name: "Por categoría" });
    expect(within(section).getByRole("link", { name: "Libros" })).toBeInTheDocument();
  });

  it("renders nothing without categories", () => {
    const { container } = render(<CategoryShowcase categories={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("AboutTeaser", () => {
  it("presents the store and links to its story", () => {
    render(<AboutTeaser />);

    const section = screen.getByRole("region", {
      name: "Una librería de barrio, con nombre de sueño.",
    });
    expect(within(section).getByRole("link", { name: "Conocé la historia" })).toHaveAttribute(
      "href",
      "/sobre-nosotros",
    );
  });
});
