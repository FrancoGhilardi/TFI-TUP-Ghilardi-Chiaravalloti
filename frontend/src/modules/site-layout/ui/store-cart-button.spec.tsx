import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "@/modules/cart/application/cart-store";

import { StoreCartButton } from "./StoreCartButton";

const product = {
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  stock: 9,
  imageUrl: "http://x/p1.webp",
};

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], syncNotice: null });
});

describe("StoreCartButton", () => {
  it("shows no number while the cart is empty", () => {
    render(<StoreCartButton />);

    expect(screen.getByRole("button", { name: "Abrir carrito" })).toBeInTheDocument();
  });

  it("follows the units in the cart, in its label and badge", () => {
    render(<StoreCartButton />);

    act(() => void useCartStore.getState().add(product, 3));

    const button = screen.getByRole("button", { name: "Abrir carrito, 3 productos" });
    expect(button).toHaveTextContent("3");
  });
});
