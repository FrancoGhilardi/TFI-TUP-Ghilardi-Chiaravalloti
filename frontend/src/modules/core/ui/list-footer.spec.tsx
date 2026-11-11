import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListFooter } from "./ListFooter";

const summary = (from: number, to: number, total: number) => `${from}–${to} de ${total}`;
const hrefFor = (page: number) => `/lista?pagina=${page}`;

describe("ListFooter", () => {
  it("tells which rows the page shows", () => {
    render(
      <ListFooter
        page={2}
        pageSize={20}
        shown={20}
        total={45}
        summary={summary}
        hrefFor={hrefFor}
      />,
    );

    expect(screen.getByText("21–40 de 45")).toBeInTheDocument();
  });

  it("ends the range at the rows the last page has", () => {
    render(
      <ListFooter
        page={3}
        pageSize={20}
        shown={5}
        total={45}
        summary={summary}
        hrefFor={hrefFor}
      />,
    );

    expect(screen.getByText("41–45 de 45")).toBeInTheDocument();
  });

  it("links the pages, marking the current one", () => {
    render(
      <ListFooter
        page={2}
        pageSize={20}
        shown={20}
        total={45}
        summary={summary}
        hrefFor={hrefFor}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Paginación" });
    expect(within(nav).getByRole("link", { name: "Página 3" })).toHaveAttribute(
      "href",
      "/lista?pagina=3",
    );
    expect(within(nav).getByRole("link", { name: "Página 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows no pages when everything fits in one", () => {
    render(
      <ListFooter page={1} pageSize={20} shown={3} total={3} summary={summary} hrefFor={hrefFor} />,
    );

    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument();
  });

  it("hides the range, not its place, while what shows is not for this query", () => {
    render(
      <ListFooter
        page={2}
        pageSize={20}
        shown={20}
        total={45}
        summary={summary}
        hrefFor={hrefFor}
        stale
      />,
    );

    expect(screen.getByText("21–40 de 45")).toHaveClass("invisible");
  });
});
