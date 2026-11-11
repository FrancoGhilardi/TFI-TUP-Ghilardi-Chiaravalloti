import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductErrorState } from "./ProductErrorState";
import { ProductNotFoundState } from "./ProductNotFoundState";

describe("ProductNotFoundState", () => {
  it("is a page of its own with the way back to the catalog, left out of search engines", () => {
    render(<ProductNotFoundState />);

    expect(
      screen.getByRole("heading", { level: 1, name: "No encontramos este producto" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos los productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );
  });
});

describe("ProductErrorState", () => {
  it("announces the failure, retries and shows the reference code", async () => {
    const retry = vi.fn();
    const person = userEvent.setup();
    render(<ProductErrorState retry={retry} digest="d1g3st" />);

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar el producto");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await person.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Código de referencia: d1g3st")).toBeInTheDocument();
  });
});
