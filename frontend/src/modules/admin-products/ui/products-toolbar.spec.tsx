import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoryOptions } from "@/modules/admin-categories";

import { EMPTY_PRODUCTS_QUERY, type ProductsQuery } from "../domain/products-query";
import { ProductsToolbar } from "./ProductsToolbar";

vi.mock("@/modules/admin-categories", () => ({ useCategoryOptions: vi.fn() }));

const CATEGORY = "3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b";

const go = vi.fn();

const renderToolbar = (overrides: Partial<ProductsQuery> = {}) => {
  const person = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<ProductsToolbar query={{ ...EMPTY_PRODUCTS_QUERY, ...overrides }} go={go} />);
  return person;
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  go.mockReset();
  vi.mocked(useCategoryOptions).mockReturnValue({
    data: [
      { id: CATEGORY, label: "Libros" },
      { id: "c2", label: " Novelas" },
    ],
  } as ReturnType<typeof useCategoryOptions>);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProductsToolbar", () => {
  it("shows the search, both selects, the three marks and the stock filter", () => {
    renderToolbar();

    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveValue("vigentes");
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Destacado" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Oferta vigente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novedad vigente" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Stock máximo" })).toHaveValue(null);
  });

  it("shows what the address has", () => {
    renderToolbar({
      q: "regla",
      state: "bajas",
      category: CATEGORY,
      featured: true,
      maxStock: 5,
    });

    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("regla");
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveValue("bajas");
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue(CATEGORY);
    expect(screen.getByRole("button", { name: "Destacado" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("spinbutton", { name: "Stock máximo" })).toHaveValue(5);
  });

  it("lists the categories in the order they come, indented", () => {
    renderToolbar();

    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(expect.arrayContaining(["Todas las categorías", "Libros", " Novelas"]));
    expect(options.indexOf("Libros")).toBeLessThan(options.indexOf(" Novelas"));
  });

  it("keeps the category of the address on screen even if the list does not have it", () => {
    vi.mocked(useCategoryOptions).mockReturnValue({ data: undefined } as ReturnType<
      typeof useCategoryOptions
    >);
    renderToolbar({ category: CATEGORY });

    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue(CATEGORY);
    expect(screen.getByRole("option", { name: "Categoría elegida" })).toBeInTheDocument();
  });

  it("applies the search once, after the typing pauses, replacing the history entry", async () => {
    const person = renderToolbar();

    await person.type(screen.getByRole("searchbox", { name: "Buscar" }), "regla");
    expect(go).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith({ q: "regla" }, { replace: true });
  });

  it("removes the search when the field is emptied", async () => {
    const person = renderToolbar({ q: "regla" });

    await person.clear(screen.getByRole("searchbox", { name: "Buscar" }));
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(go).toHaveBeenCalledWith({ q: undefined }, { replace: true });
  });

  it("changes the state from the select", async () => {
    const person = renderToolbar();

    await person.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "bajas");

    expect(go).toHaveBeenCalledWith({ state: "bajas" });
  });

  it("picks a category and goes back to all of them", async () => {
    const person = renderToolbar({ category: CATEGORY });
    const select = screen.getByRole("combobox", { name: "Categoría" });

    await person.selectOptions(select, "c2");
    expect(go).toHaveBeenLastCalledWith({ category: "c2" });
    await person.selectOptions(select, "");
    expect(go).toHaveBeenLastCalledWith({ category: undefined });
  });

  it("turns a mark on and off, also from the keyboard", async () => {
    const person = renderToolbar({ onSale: true });

    await person.click(screen.getByRole("button", { name: "Destacado" }));
    expect(go).toHaveBeenLastCalledWith({ featured: true });
    await person.click(screen.getByRole("button", { name: "Oferta vigente" }));
    expect(go).toHaveBeenLastCalledWith({ onSale: false });

    screen.getByRole("button", { name: "Novedad vigente" }).focus();
    await person.keyboard(" ");
    expect(go).toHaveBeenLastCalledWith({ isNew: true });
  });

  it("applies the stock after the pause and removes it when emptied", async () => {
    const person = renderToolbar({ maxStock: 5 });
    const field = screen.getByRole("spinbutton", { name: "Stock máximo" });

    await person.clear(field);
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(go).toHaveBeenLastCalledWith({ maxStock: undefined }, { replace: true });

    await person.type(field, "0");
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(go).toHaveBeenLastCalledWith({ maxStock: 0 }, { replace: true });
  });

  it("does not send a stock that is not a whole number", async () => {
    const person = renderToolbar();

    await person.type(screen.getByRole("spinbutton", { name: "Stock máximo" }), "-3");
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(go).not.toHaveBeenCalled();
  });

  it("offers to clear the filters only when something is filtering, keeping the sort", async () => {
    const { unmount } = render(<ProductsToolbar query={EMPTY_PRODUCTS_QUERY} go={go} />);
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    unmount();

    const person = renderToolbar({ q: "x", featured: true, sort: "precio", direction: "desc" });
    await person.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(go).toHaveBeenCalledWith(
      expect.objectContaining({
        q: undefined,
        featured: false,
        state: "vigentes",
        sort: "precio",
        direction: "desc",
      }),
    );
  });
});
