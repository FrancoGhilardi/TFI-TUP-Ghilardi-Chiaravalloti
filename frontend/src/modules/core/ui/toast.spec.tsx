import { render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";

import { Toaster } from "./primitives/sonner";
import { toast } from "./toast";

describe("toast", () => {
  it("shows a success message in the toaster", async () => {
    render(<Toaster />);

    act(() => {
      toast.success("Producto dado de baja");
    });

    expect(await screen.findByText("Producto dado de baja")).toBeInTheDocument();
  });

  it("shows an error message in the toaster", async () => {
    render(<Toaster />);

    act(() => {
      toast.error("No pudimos reactivar el producto");
    });

    expect(await screen.findByText("No pudimos reactivar el producto")).toBeInTheDocument();
  });

  it("lives in a region that assistive technology announces", async () => {
    render(<Toaster />);

    act(() => {
      toast.success("Listo");
    });
    await screen.findByText("Listo");

    expect(document.querySelector("[aria-live]")).not.toBeNull();
  });
});
