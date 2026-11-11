import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PanelErrorPage } from "./PanelErrorPage";
import { PanelNotFound } from "./PanelNotFound";

describe("PanelNotFound", () => {
  it("says the page does not exist and leads back to the panel's start", () => {
    render(<PanelNotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "No encontramos esa página" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio del panel" })).toHaveAttribute(
      "href",
      "/admin/inicio",
    );
    expect(screen.queryByRole("link", { name: "Consultar por WhatsApp" })).not.toBeInTheDocument();
  });
});

describe("PanelErrorPage", () => {
  it("retries, leads back to the panel's start and shows the reference", async () => {
    const retry = vi.fn();
    const person = userEvent.setup();
    render(<PanelErrorPage retry={retry} digest="d1g3st" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal");
    await person.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Ir al inicio del panel" })).toHaveAttribute(
      "href",
      "/admin/inicio",
    );
    expect(screen.getByText("Código de referencia: d1g3st")).toBeInTheDocument();
  });
});
