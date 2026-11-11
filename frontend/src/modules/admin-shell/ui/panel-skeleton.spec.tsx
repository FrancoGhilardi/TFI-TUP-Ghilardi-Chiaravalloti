import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PanelSkeleton } from "./PanelSkeleton";

describe("PanelSkeleton", () => {
  it("is the page's main area, busy, and says what is loading", () => {
    const { container } = render(<PanelSkeleton />);

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Cargando el panel…");
    const blocks = container.querySelectorAll(".animate-pulse");
    expect(blocks.length).toBeGreaterThan(2);
    for (const block of blocks) {
      expect(block).toHaveAttribute("aria-hidden", "true");
    }
  });
});
