import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCartStore } from "../application/cart-store";
import type { CartProduct } from "../domain/cart";
import { AddToCart } from "./AddToCart";
import { CartSyncNotice } from "./CartSyncNotice";
import { QuantitySelector } from "./QuantitySelector";
import { QuickAddToCart } from "./QuickAddToCart";

const product = (overrides: Partial<CartProduct> = {}): CartProduct => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  stock: 3,
  imageUrl: "http://x/p1.webp",
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], syncNotice: null });
});

describe("QuantitySelector", () => {
  const renderSelector = (overrides = {}) => {
    const props = {
      quantity: 2,
      canDecrease: true,
      canIncrease: true,
      onDecrease: vi.fn(),
      onIncrease: vi.fn(),
      ...overrides,
    };
    render(<QuantitySelector {...props} />);
    return props;
  };

  it("shows the quantity in a named group with a button to lower and one to raise it", async () => {
    const props = renderSelector();

    const group = screen.getByRole("group", { name: "Cantidad" });
    expect(group).toHaveTextContent("2");
    await userEvent.click(screen.getByRole("button", { name: "Quitar uno" }));
    await userEvent.click(screen.getByRole("button", { name: "Sumar uno" }));

    expect(props.onDecrease).toHaveBeenCalledOnce();
    expect(props.onIncrease).toHaveBeenCalledOnce();
  });

  it("disables each button at its end", () => {
    renderSelector({ quantity: 1, canDecrease: false, canIncrease: false });

    expect(screen.getByRole("button", { name: "Quitar uno" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sumar uno" })).toBeDisabled();
  });
});

describe("AddToCart", () => {
  it("puts the picked quantity in the cart and confirms it", async () => {
    const user = userEvent.setup();
    render(<AddToCart product={product()} />);

    await user.click(screen.getByRole("button", { name: "Sumar uno" }));
    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    expect(screen.getByRole("status")).toHaveTextContent("Agregaste 2 al carrito");
    expect(useCartStore.getState().items).toEqual([{ ...product(), quantity: 2 }]);
  });

  it("limits the picker to the stock", async () => {
    const user = userEvent.setup();
    render(<AddToCart product={product({ stock: 2 })} />);

    await user.click(screen.getByRole("button", { name: "Sumar uno" }));

    expect(screen.getByRole("button", { name: "Sumar uno" })).toBeDisabled();
    expect(screen.getByRole("group", { name: "Cantidad" })).toHaveTextContent("2");
  });

  it("says when only part of it fit and when nothing could be added", async () => {
    const user = userEvent.setup();
    useCartStore.getState().add(product({ stock: 3 }), 2);
    render(<AddToCart product={product({ stock: 3 })} />);

    await user.click(screen.getByRole("button", { name: "Sumar uno" }));
    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Agregaste 1 al carrito. Ya tenés todas las unidades disponibles.",
    );

    await user.click(screen.getByRole("button", { name: "Agregar al carrito" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ya tenés en el carrito todas las unidades disponibles",
    );
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it("disables the button and says why when there is no stock", () => {
    render(<AddToCart product={product({ stock: 0 })} />);

    expect(screen.getByRole("button", { name: "Sin stock" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sumar uno" })).toBeDisabled();
  });
});

describe("QuickAddToCart", () => {
  it("puts one unit in the cart and confirms it", async () => {
    render(<QuickAddToCart product={product()} />);

    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(screen.getByRole("status")).toHaveTextContent("Agregaste 1 al carrito");
    expect(useCartStore.getState().items).toEqual([{ ...product(), quantity: 1 }]);
  });

  it("drops the confirmation when the product leaves the cart", async () => {
    render(<QuickAddToCart product={product()} />);
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Agregaste 1 al carrito");

    act(() => useCartStore.getState().remove("p1"));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("says so when the cart already holds every unit in stock", async () => {
    useCartStore.getState().add(product({ stock: 1 }), 1);
    render(<QuickAddToCart product={product({ stock: 1 })} />);

    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Ya tenés en el carrito todas las unidades disponibles",
    );
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("is disabled and says why without stock", () => {
    render(<QuickAddToCart product={product({ stock: 0 })} />);

    expect(screen.getByRole("button", { name: "Sin stock" })).toBeDisabled();
  });
});

describe("CartSyncNotice", () => {
  it("renders nothing visible while the cart has nothing to say", () => {
    render(<CartSyncNotice product={product()} />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("refreshes the product on opening and tells when the quantity was lowered", () => {
    useCartStore.getState().add(product({ stock: 5 }), 4);

    render(<CartSyncNotice product={product({ stock: 2 })} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Ajustamos la cantidad de «Cuaderno A4» en tu carrito al stock disponible: 2",
    );
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("tells when the product left the cart for lack of stock", () => {
    useCartStore.getState().add(product({ stock: 5 }), 1);

    render(<CartSyncNotice product={product({ stock: 0 })} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Sacamos «Cuaderno A4» de tu carrito porque ya no tiene stock",
    );
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("ignores a notice about another product", () => {
    useCartStore.setState({
      syncNotice: { kind: "removed", productId: "other", title: "Otro" },
    });

    render(<CartSyncNotice product={product()} />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
