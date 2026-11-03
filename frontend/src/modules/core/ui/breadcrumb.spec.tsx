import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("links every step but the last, which marks the current page", () => {
    render(
      <Breadcrumb
        label="Migas de pan"
        items={[
          { label: "Inicio", href: "/" },
          { label: "Cuadernos", href: "/c" },
          { label: "Cuaderno A4" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Cuaderno A4")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Cuaderno A4" })).not.toBeInTheDocument();
  });

  it("copes with a page named like its category, without repeating a key", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Breadcrumb
        label="Migas de pan"
        items={[
          { label: "Lapiceras", href: "/productos?categoria=lapiceras" },
          { label: "Lapiceras" },
        ]}
      />,
    );

    expect(screen.getAllByText("Lapiceras")).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
