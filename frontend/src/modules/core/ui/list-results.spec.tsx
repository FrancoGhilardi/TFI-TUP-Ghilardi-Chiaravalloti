import type { UseQueryResult } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ListResults } from "./ListResults";

interface Item {
  id: string;
  name: string;
}

const text = {
  loading: "Cargando lista",
  error: { title: "No pudimos cargar", text: "Revisá tu conexión.", retry: "Reintentar" },
  outOfRange: { title: "Esa página no existe", text: "Hay menos.", action: "Ir a la primera" },
  summary: (from: number, to: number, total: number) => `${from}–${to} de ${total}`,
};

const listOf = (overrides: Record<string, unknown> = {}) =>
  ({
    isPending: false,
    isFetching: false,
    isPlaceholderData: false,
    dataUpdatedAt: 0,
    data: { items: [{ id: "1", name: "Cuaderno" }], total: 1 },
    refetch: vi.fn(),
    ...overrides,
  }) as unknown as UseQueryResult<{ items: Item[]; total: number }>;

const renderResults = (list: UseQueryResult<{ items: Item[]; total: number }>, page = 1) =>
  render(
    <ListResults
      list={list}
      page={page}
      pageSize={20}
      firstPageHref="/lista"
      hrefFor={(next) => `/lista?pagina=${next}`}
      text={text}
      empty={<p>No hay nada</p>}
    >
      {(items, readAt) => (
        <ul data-read-at={readAt.getTime()}>
          {items.map(({ id, name }) => (
            <li key={id}>{name}</li>
          ))}
        </ul>
      )}
    </ListResults>,
  );

describe("ListResults", () => {
  it("shows grey rows, named for assistive technology, while it loads", () => {
    renderResults(listOf({ isPending: true, data: undefined }));

    expect(screen.getByRole("list", { name: "Cargando lista" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("says what failed and reads again on request when there is nothing to show", async () => {
    const refetch = vi.fn();
    const person = userEvent.setup();
    renderResults(listOf({ data: undefined, refetch }));

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar");
    await person.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows what it was given when the list is empty on the first page", () => {
    renderResults(listOf({ data: { items: [], total: 0 } }));

    expect(screen.getByText("No hay nada")).toBeInTheDocument();
  });

  it("leads back to the first page when the page asked for is past the end", () => {
    renderResults(listOf({ data: { items: [], total: 3 } }), 4);

    expect(screen.queryByText("No hay nada")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a la primera" })).toHaveAttribute("href", "/lista");
  });

  it("hands the rows and the moment they were read to whoever draws them", () => {
    renderResults(listOf({ dataUpdatedAt: 1_700_000_000_000 }));

    expect(screen.getByText("Cuaderno")).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveAttribute("data-read-at", "1700000000000");
    expect(screen.getByText("1–1 de 1")).toBeInTheDocument();
  });

  it("keeps the last page as a reference, out of reach, while the next one loads", () => {
    const { container } = renderResults(listOf({ isFetching: true, isPlaceholderData: true }));

    const frame = container.firstElementChild as HTMLElement;
    expect(frame).toHaveAttribute("aria-busy", "true");
    expect(frame).toHaveAttribute("inert");
  });

  it("is a live, reachable list once it has loaded", () => {
    const { container } = renderResults(listOf());

    const frame = container.firstElementChild as HTMLElement;
    expect(frame).toHaveAttribute("aria-busy", "false");
    expect(frame).not.toHaveAttribute("inert");
  });
});
