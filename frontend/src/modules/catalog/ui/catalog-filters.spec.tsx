import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { activeFilters } from "../domain/active-filters";
import { parseCatalogQuery } from "../domain/catalog-query";
import type { CategoryNode } from "../domain/category";
import { ActiveFilters } from "./ActiveFilters";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogErrorState } from "./CatalogErrorState";
import { CatalogSearch } from "./CatalogSearch";
import { CategoryNav } from "./CategoryNav";
import { PageOutOfRange } from "./PageOutOfRange";
import { SortSelect } from "./SortSelect";

const node = (slug: string, name: string, children: CategoryNode[] = []): CategoryNode => ({
  id: slug,
  name,
  slug,
  description: null,
  children,
});

const tree = [
  node("libros", "Libros", [node("novelas", "Novelas"), node("infantiles", "Infantiles")]),
  node("arte", "Arte"),
];

const hiddenFields = (form: HTMLElement) =>
  Object.fromEntries(
    [...form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].map((input) => [
      input.name,
      input.value,
    ]),
  );

describe("CategoryNav", () => {
  it("links every category keeping the other filters and marks 'Todos' without one", () => {
    render(<CategoryNav tree={tree} query={parseCatalogQuery({ q: "lapiz", pagina: "3" })} />);

    const nav = screen.getByRole("navigation", { name: "Categorías" });
    expect(within(nav).getByRole("link", { name: "Todos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Arte" })).toHaveAttribute(
      "href",
      "/productos?q=lapiz&categoria=arte",
    );
    expect(within(nav).getByText("Todos", { selector: "summary span span" })).toBeInTheDocument();
  });

  it("nests the subcategories under their category, folded until its toggle opens them", async () => {
    const user = userEvent.setup();
    render(<CategoryNav tree={tree} query={parseCatalogQuery({})} />);

    const toggle = screen.getByRole("button", { name: "Subcategorías de Libros" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Novelas" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const subcategories = screen.getByRole("list", { name: "Libros" });
    expect(within(subcategories).getByRole("link", { name: "Novelas" })).toHaveAttribute(
      "href",
      "/productos?categoria=novelas",
    );
  });

  it("opens the branch of a deep selected category and marks it", () => {
    const deepTree = [
      node("escolar", "Escolar", [
        node("cuadernos", "Cuadernos", [node("rayados", "Rayados"), node("lisos", "Lisos")]),
        node("mochilas", "Mochilas", [node("con-carro", "Con carro")]),
      ]),
    ];
    render(<CategoryNav tree={deepTree} query={parseCatalogQuery({ categoria: "rayados" })} />);

    expect(screen.getByRole("button", { name: "Subcategorías de Escolar" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const deepest = screen.getByRole("list", { name: "Cuadernos" });
    expect(within(deepest).getByRole("link", { name: "Rayados" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(deepest).getByRole("link", { name: "Lisos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subcategorías de Mochilas" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("Rayados", { selector: "summary span span" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todos" })).not.toHaveAttribute("aria-current");
  });

  it("offers only 'Todos' without a tree", () => {
    render(<CategoryNav tree={[]} query={parseCatalogQuery({})} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("CatalogSearch", () => {
  it("submits q to the catalog keeping category, filters and sort but not the page", () => {
    const query = parseCatalogQuery({
      q: "lapiz",
      categoria: "arte",
      destacados: "true",
      orden: "a-z",
      pagina: "4",
    });
    render(<CatalogSearch query={query} />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/productos");
    // GET is the form default, which a browser without JavaScript uses too.
    expect((form as HTMLFormElement).method).toBe("get");
    expect(within(form).getByRole("searchbox", { name: "Buscar en el catálogo" })).toHaveValue(
      "lapiz",
    );
    expect(hiddenFields(form)).toEqual({ categoria: "arte", destacados: "true", orden: "a-z" });
  });
});

describe("SortSelect", () => {
  it("shows the sort options with the current one selected and carries the other parameters", () => {
    const query = parseCatalogQuery({ q: "lapiz", orden: "menor-precio", pagina: "2" });
    render(<SortSelect query={query} />);

    const select = screen.getByRole("combobox", { name: "Ordenar por" });
    expect(select).toHaveValue("menor-precio");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Relevancia", "Menor precio", "Mayor precio", "Más recientes", "A-Z"]);
    expect(hiddenFields(select.closest("form") as HTMLElement)).toEqual({ q: "lapiz" });
  });

  it("applies the sort as soon as it changes, with no 'Aplicar' button once scripts run", () => {
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});
    render(<SortSelect query={parseCatalogQuery({})} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a-z" } });

    expect(requestSubmit).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    requestSubmit.mockRestore();
  });
});

describe("ActiveFilters", () => {
  it("removes each filter with its chip and clears them all", () => {
    const query = parseCatalogQuery({ q: "cuento", categoria: "infantiles", destacados: "true" });
    render(<ActiveFilters filters={activeFilters(query, tree)} query={query} />);

    expect(screen.getByRole("link", { name: "Quitar filtro Búsqueda: cuento" })).toHaveAttribute(
      "href",
      "/productos?categoria=infantiles&destacados=true",
    );
    expect(screen.getByRole("link", { name: "Quitar filtro Infantiles" })).toHaveAttribute(
      "href",
      "/productos?q=cuento&destacados=true",
    );
    expect(screen.getByRole("link", { name: "Quitar filtro Destacados" })).toHaveAttribute(
      "href",
      "/productos?q=cuento&categoria=infantiles",
    );
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });

  it("keeps the sort when clearing the filters, since it is not one", () => {
    const query = parseCatalogQuery({ q: "cuento", orden: "menor-precio" });
    render(<ActiveFilters filters={activeFilters(query, tree)} query={query} />);

    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute(
      "href",
      "/productos?orden=menor-precio",
    );
  });

  it("renders nothing without filters", () => {
    const { container } = render(<ActiveFilters filters={[]} query={parseCatalogQuery({})} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("catalog states", () => {
  it("says what was searched when nothing matches and offers the whole catalog and WhatsApp", () => {
    render(<CatalogEmptyState search="lapiz" />);

    const status = screen.getByRole("status");
    expect(within(status).getByRole("heading")).toHaveTextContent(
      "No encontramos productos para «lapiz»",
    );
    expect(within(status).getByRole("link", { name: "Ver todos los productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
    expect(within(status).getByRole("link", { name: "Consultanos por WhatsApp" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("links an out-of-range page to the first one", () => {
    render(<PageOutOfRange firstPageHref="/productos?q=lapiz" />);

    expect(screen.getByRole("link", { name: "Ir a la primera página" })).toHaveAttribute(
      "href",
      "/productos?q=lapiz",
    );
  });

  it("announces a failure and offers to retry the same URL", () => {
    render(<CatalogErrorState retryHref="/productos?pagina=2" />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("No pudimos cargar los productos");
    expect(within(alert).getByRole("link", { name: "Reintentar" })).toHaveAttribute(
      "href",
      "/productos?pagina=2",
    );
  });
});
