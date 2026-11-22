import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListEmptyState } from "./ListEmptyState";
import { ListPage } from "./ListPage";
import { ListToolbar } from "./ListToolbar";

describe("ListPage", () => {
  it("heads the list, links to create a record and frames what it holds", () => {
    render(
      <ListPage
        eyebrow="Catálogo"
        title="Categorías"
        lead="Ordená el catálogo."
        create={{ label: "Nueva categoría", href: "/admin/categorias/nueva" }}
      >
        <p>contenido</p>
      </ListPage>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByText("Catálogo")).toBeInTheDocument();
    expect(screen.getByText("Ordená el catálogo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nueva categoría" })).toHaveAttribute(
      "href",
      "/admin/categorias/nueva",
    );
    expect(screen.getByRole("region", { name: "Categorías" })).toHaveTextContent("contenido");
  });
});

describe("ListEmptyState", () => {
  const text = {
    filteredTitle: "Sin resultados",
    filteredText: "Probá con otra búsqueda.",
    noneTitle: "Todavía no hay categorías",
    noneText: "Creá la primera.",
    clear: "Limpiar filtros",
  };
  const create = { label: "Nueva categoría", href: "/admin/categorias/nueva" };

  it("offers to clear the filters when they are what hides the records", async () => {
    const onClear = vi.fn();
    const person = userEvent.setup();
    render(<ListEmptyState icon={Tag} filtered onClear={onClear} text={text} create={create} />);

    expect(screen.getByRole("heading", { name: "Sin resultados" })).toBeInTheDocument();
    expect(screen.getByText("Probá con otra búsqueda.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nueva categoría" })).not.toBeInTheDocument();

    await person.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("offers to create the first record when there is none", () => {
    render(
      <ListEmptyState icon={Tag} filtered={false} onClear={vi.fn()} text={text} create={create} />,
    );

    expect(screen.getByRole("heading", { name: "Todavía no hay categorías" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nueva categoría" })).toHaveAttribute(
      "href",
      "/admin/categorias/nueva",
    );
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });
});

describe("ListToolbar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const search = (onSearch = vi.fn()) => ({
    id: "lista-busqueda",
    label: "Buscar",
    placeholder: "Buscar por nombre…",
    value: "regla",
    onSearch,
  });

  it("has a search box with its limit and the text of the address", () => {
    render(<ListToolbar search={search()} />);

    const box = screen.getByRole("searchbox", { name: "Buscar" });
    expect(box).toHaveValue("regla");
    expect(box).toHaveAttribute("maxlength", "100");
  });

  it("reports what is searched once the typing pauses", async () => {
    const onSearch = vi.fn();
    const person = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ListToolbar search={{ ...search(onSearch), value: "" }} />);

    await person.type(screen.getByRole("searchbox", { name: "Buscar" }), "lapiz");
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(onSearch).toHaveBeenCalledWith("lapiz");
  });

  it("shows the filters and the extra row it is given", () => {
    render(
      <ListToolbar search={search()} extra={<p>marcas</p>}>
        <button type="button">Estado</button>
      </ListToolbar>,
    );

    expect(screen.getByRole("button", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getByText("marcas")).toBeInTheDocument();
  });

  it("takes the filters away only when told something narrows the list", async () => {
    const onClear = vi.fn();
    const person = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender } = render(
      <ListToolbar search={search()} clear={{ label: "Limpiar", onClear }} />,
    );

    await person.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onClear).toHaveBeenCalledTimes(1);

    rerender(<ListToolbar search={search()} clear={false} />);
    expect(screen.queryByRole("button", { name: "Limpiar" })).not.toBeInTheDocument();
  });
});
