import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StoreErrorPage } from "./StoreErrorPage";
import { StoreNotFound } from "./StoreNotFound";

describe("StoreNotFound", () => {
  it("says the page does not exist and leads to the home and to the catalog", () => {
    render(<StoreNotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "No encontramos esa página" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Ver productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
  });
});

describe("StoreErrorPage", () => {
  it("retries, leads home and offers to ask by WhatsApp", async () => {
    const retry = vi.fn();
    const person = userEvent.setup();
    render(<StoreErrorPage retry={retry} digest="d1g3st" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal");
    await person.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Consultar por WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/"),
    );
    expect(screen.getByText("Código de referencia: d1g3st")).toBeInTheDocument();
  });

  it("shows no reference when the failure has none", () => {
    render(<StoreErrorPage retry={() => {}} />);

    expect(screen.queryByText(/Código de referencia/)).not.toBeInTheDocument();
  });
});
