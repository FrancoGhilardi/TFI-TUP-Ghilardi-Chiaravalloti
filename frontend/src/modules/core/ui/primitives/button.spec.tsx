import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders a button by default", () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("renders its child with the button styles when asChild is set", () => {
    render(
      <Button asChild variant="whatsapp">
        <a href="https://wa.me/1">WhatsApp</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "WhatsApp" });
    expect(link).toHaveAttribute("href", "https://wa.me/1");
    expect(link).toHaveClass("bg-wa-strong");
  });
});
