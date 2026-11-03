import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { StoreSearchState } from "../application/useStoreSearch";
import type { ProductCard } from "../domain/product-card";
import type { SearchSuggestions } from "../domain/search-term";
import { SearchAnnouncement } from "./SearchAnnouncement";
import { SearchResults } from "./SearchResults";

const product = (slug: string, overrides: Partial<ProductCard> = {}): ProductCard => ({
  id: slug,
  slug,
  title: `Producto ${slug}`,
  price: "9800.00",
  salePrice: null,
  stock: 5,
  isOnSale: false,
  isNew: false,
  isFeatured: false,
  image: {
    url: `http://127.0.0.1:54321/storage/v1/object/public/product-images/${slug}.webp`,
    alt: slug,
    optimizable: true,
  },
  category: null,
  ...overrides,
});

const suggestions: SearchSuggestions = {
  products: [
    product("cuaderno-a4"),
    product("cuaderno-oferta", { isOnSale: true, salePrice: "8000.00" }),
  ],
  categories: [{ id: "c1", name: "Cuadernos", slug: "cuadernos" }],
};

const search = (overrides: Partial<StoreSearchState>): StoreSearchState => ({
  term: "cuaderno",
  status: "success",
  suggestions,
  retry: vi.fn(),
  ...overrides,
});

const renderResults = (state: StoreSearchState, onNavigate = vi.fn(), needsMoreText = false) => {
  render(<SearchResults search={state} needsMoreText={needsMoreText} onNavigate={onNavigate} />);
  return onNavigate;
};

describe("SearchResults", () => {
  it("asks for at least two characters while there is no term", () => {
    renderResults(search({ term: undefined, status: "idle", suggestions: undefined }));

    expect(screen.getByText("Escribí al menos 2 letras o números.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("turns the hint into an alert after a try with too little text", () => {
    renderResults(
      search({ term: undefined, status: "idle", suggestions: undefined }),
      vi.fn(),
      true,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Escribí al menos 2 letras o números.");
  });

  it("does not say the new term matched nothing while it still shows an empty old answer", () => {
    renderResults(
      search({
        term: "cuaderno",
        status: "loading",
        suggestions: { products: [], categories: [] },
      }),
    );

    expect(screen.getByText("Buscando…")).toBeInTheDocument();
    expect(screen.queryByText(/No encontramos resultados/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todos los resultados/ })).toBeInTheDocument();
  });

  it("says it is searching while the first answer for a term has not come", () => {
    renderResults(search({ status: "loading", suggestions: undefined }));

    expect(screen.getByText("Buscando…")).toBeInTheDocument();
  });

  it("lists the products and the categories, each linking to where it lives", () => {
    renderResults(search({}));

    const products = screen.getByRole("heading", { name: "Productos" }).closest("section");
    const categories = screen.getByRole("heading", { name: "Categorías" }).closest("section");
    expect(
      within(products as HTMLElement).getByRole("link", { name: /Producto cuaderno-a4/ }),
    ).toHaveAttribute("href", "/productos/cuaderno-a4");
    expect(
      within(categories as HTMLElement).getByRole("link", { name: "Cuadernos" }),
    ).toHaveAttribute("href", "/productos?categoria=cuadernos");
    expect(screen.getByRole("link", { name: /cuaderno-oferta/ })).toHaveTextContent("$ 8.000");
  });

  it("shows only the group that has items", () => {
    renderResults(search({ suggestions: { products: [], categories: suggestions.categories } }));

    expect(screen.queryByRole("heading", { name: "Productos" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Categorías" })).toBeInTheDocument();
  });

  it("offers every result in the catalog with the term, also while it keeps the old answer", () => {
    renderResults(search({ status: "loading", term: "lapiz" }));

    expect(
      screen.getByRole("link", { name: "Ver todos los resultados para «lapiz»" }),
    ).toHaveAttribute("href", "/productos?q=lapiz");
    expect(screen.getByRole("link", { name: /cuaderno-a4/ })).toBeInTheDocument();
  });

  it("says nothing matched and still offers the catalog", () => {
    renderResults(search({ suggestions: { products: [], categories: [] } }));

    expect(screen.getByText("No encontramos resultados para «cuaderno».")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todos los resultados/ })).toBeInTheDocument();
  });

  it("announces a failure, offers to retry and keeps the catalog link", async () => {
    const retry = vi.fn();
    renderResults(search({ status: "error", suggestions: undefined, retry }));

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos buscar ahora. Probá de nuevo.");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: /Ver todos los resultados/ })).toBeInTheDocument();
  });

  it("tells the host when the visitor chooses a result", async () => {
    const onNavigate = renderResults(search({}));

    await userEvent.click(screen.getByRole("link", { name: "Cuadernos" }));

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

describe("SearchAnnouncement", () => {
  const nothing: SearchSuggestions = { products: [], categories: [] };
  const cases: [string, StoreSearchState["status"], SearchSuggestions | undefined, string][] = [
    ["the counts", "success", suggestions, "2 productos y 1 categoría"],
    ["that nothing matched", "success", nothing, "Sin resultados"],
    ["the failure", "error", undefined, "No pudimos buscar ahora"],
    ["nothing while it loads", "loading", suggestions, ""],
    ["nothing before a term", "idle", undefined, ""],
  ];

  it.each(cases)("announces %s", (_name, status, answer, text) => {
    render(<SearchAnnouncement search={{ status, suggestions: answer }} />);

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});
