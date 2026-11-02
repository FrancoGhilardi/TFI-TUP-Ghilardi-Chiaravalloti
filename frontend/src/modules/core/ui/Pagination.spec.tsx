import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pagination } from "./Pagination";

const hrefFor = (page: number) => `/productos?pagina=${page}`;

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination current={1} total={1} hrefFor={hrefFor} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("links every page shown and marks the current one", () => {
    render(<Pagination current={5} total={20} hrefFor={hrefFor} />);

    const nav = screen.getByRole("navigation", { name: "Paginación" });
    const pages = within(nav)
      .getAllByRole("link", { name: /^Página/ })
      .map((link) => link.textContent);
    expect(pages).toEqual(["1", "4", "5", "6", "20"]);
    expect(within(nav).getByRole("link", { name: "Página 5" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Página 20" })).toHaveAttribute(
      "href",
      "/productos?pagina=20",
    );
  });

  it("links to the previous and next pages", () => {
    render(<Pagination current={5} total={20} hrefFor={hrefFor} />);

    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/productos?pagina=4",
    );
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute(
      "href",
      "/productos?pagina=6",
    );
  });

  it("turns previous and next into plain text at the ends", () => {
    const { rerender } = render(<Pagination current={1} total={3} hrefFor={hrefFor} />);
    expect(screen.queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.getByText("Anterior")).toBeInTheDocument();

    rerender(<Pagination current={3} total={3} hrefFor={hrefFor} />);
    expect(screen.queryByRole("link", { name: "Siguiente" })).not.toBeInTheDocument();
  });
});
