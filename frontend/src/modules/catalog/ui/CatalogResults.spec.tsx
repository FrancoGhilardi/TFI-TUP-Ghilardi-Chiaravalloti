import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Page } from "@/modules/core/http";

import { catalogView } from "../application/catalog-view";
import { parseCatalogQuery } from "../domain/catalog-query";
import type { ProductCard } from "../domain/product-card";
import { CatalogResults } from "./CatalogResults";
import { ResultsAnnouncement } from "./ResultsAnnouncement";

const card = (id: string): ProductCard => ({
  id,
  slug: `producto-${id}`,
  title: `Producto ${id}`,
  price: "1000.00",
  salePrice: null,
  isOnSale: false,
  isNew: false,
  isFeatured: false,
  image: {
    url: `http://127.0.0.1:54321/storage/v1/object/public/product-images/${id}.webp`,
    alt: `Producto ${id}`,
    optimizable: true,
  },
  category: null,
});

const page = (overrides: Partial<Page<ProductCard>>): Page<ProductCard> => ({
  items: [card("1"), card("2")],
  page: 2,
  limit: 20,
  totalItems: 42,
  totalPages: 3,
  ...overrides,
});

const query = parseCatalogQuery({ q: "lapiz", destacados: "true", pagina: "2" });

describe("CatalogResults", () => {
  it("shows the total, the active filters, the products and the pagination keeping the filters", () => {
    render(
      <CatalogResults
        view={catalogView({ status: "ok", page: page({}) })}
        query={query}
        tree={[]}
      />,
    );

    const results = screen.getByRole("region", { name: "Resultados" });
    expect(within(results).getByText("42 productos")).toBeInTheDocument();
    expect(
      within(results).getByRole("link", { name: "Quitar filtro Búsqueda: lapiz" }),
    ).toBeInTheDocument();
    expect(within(results).getAllByRole("article")).toHaveLength(2);
    expect(within(results).getByRole("link", { name: "Página 3" })).toHaveAttribute(
      "href",
      "/productos?q=lapiz&destacados=true&pagina=3",
    );
  });

  it("shows the empty state when nothing matches", () => {
    render(
      <CatalogResults
        view={catalogView({
          status: "ok",
          page: page({ items: [], totalItems: 0, totalPages: 0 }),
        })}
        query={query}
        tree={[]}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent("No encontramos productos para «lapiz»");
  });

  it("links a page past the last one to the first page with the same filters", () => {
    render(
      <CatalogResults
        view={catalogView({ status: "ok", page: page({ items: [], page: 9 }) })}
        query={query}
        tree={[]}
      />,
    );

    expect(screen.getByRole("link", { name: "Ir a la primera página" })).toHaveAttribute(
      "href",
      "/productos?q=lapiz&destacados=true",
    );
  });

  it("offers to retry the same page when the products could not be read", () => {
    render(<CatalogResults view={catalogView({ status: "error" })} query={query} tree={[]} />);

    expect(screen.getByRole("link", { name: "Reintentar" })).toHaveAttribute(
      "href",
      "/productos?q=lapiz&destacados=true&pagina=2",
    );
  });
});

describe("ResultsAnnouncement", () => {
  it.each([
    ["the number of products", { status: "ok" as const, page: page({}) }, "42 productos"],
    [
      "that nothing matched",
      { status: "ok" as const, page: page({ items: [], totalItems: 0, totalPages: 0 }) },
      "Sin resultados",
    ],
    [
      "that the products could not be read",
      { status: "error" as const },
      "No se pudieron cargar los productos",
    ],
  ])("announces %s", (_name, result, text) => {
    render(<ResultsAnnouncement view={catalogView(result)} />);

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});
