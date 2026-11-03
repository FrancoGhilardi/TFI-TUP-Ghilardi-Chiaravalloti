import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "../application/cart-store";
import type { CartProduct } from "../domain/cart";
import { CartDrawer } from "./CartDrawer";

const product = (overrides: Partial<CartProduct> = {}): CartProduct => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  stock: 3,
  imageUrl: "http://x/p1.webp",
  ...overrides,
});

const renderDrawer = () => render(<CartDrawer open onOpenChange={() => {}} />);

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], syncNotice: null });
});

describe("CartDrawer", () => {
  it("tells an empty cart apart and offers the catalog", () => {
    renderDrawer();

    expect(screen.getByRole("dialog", { name: "Tu carrito" })).toBeInTheDocument();
    expect(screen.getByText("Todavía no agregaste productos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver productos" })).toHaveAttribute(
      "href",
      "/productos",
    );
    expect(screen.queryByRole("link", { name: "Pedir por WhatsApp" })).not.toBeInTheDocument();
  });

  it("lists each product with its subtotal and the total", () => {
    useCartStore.getState().add(product(), 2);
    useCartStore.getState().add(product({ id: "p2", title: "Lápiz", price: "500.00" }), 1);
    renderDrawer();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Cuaderno A4")).toBeInTheDocument();
    expect(within(items[0]).getByText("$ 19.600")).toBeInTheDocument();
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("$ 20.100");
  });

  it("changes the quantity with the keyboard and stops at the stock", async () => {
    useCartStore.getState().add(product({ stock: 2 }), 1);
    const user = userEvent.setup();
    renderDrawer();

    const more = screen.getByRole("button", { name: "Sumar uno de «Cuaderno A4»" });
    more.focus();
    await user.keyboard("{Enter}");

    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(more).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quitar uno de «Cuaderno A4»" })).toBeEnabled();
  });

  it("does not lower the quantity below one: removing is its own button", () => {
    useCartStore.getState().add(product(), 1);
    renderDrawer();

    expect(screen.getByRole("button", { name: "Quitar uno de «Cuaderno A4»" })).toBeDisabled();
  });

  it("names each quantity control after its product", () => {
    useCartStore.getState().add(product(), 1);
    useCartStore.getState().add(product({ id: "p2", title: "Lápiz" }), 1);
    renderDrawer();

    expect(screen.getByRole("group", { name: "Cantidad de «Lápiz»" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumar uno de «Lápiz»" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumar uno de «Cuaderno A4»" })).toBeInTheDocument();
  });

  it("removes a product", async () => {
    useCartStore.getState().add(product(), 1);
    renderDrawer();

    await userEvent.click(screen.getByRole("button", { name: "Quitar «Cuaderno A4» del carrito" }));

    expect(useCartStore.getState().items).toEqual([]);
    expect(screen.getByText("Todavía no agregaste productos.")).toBeInTheDocument();
  });

  it("empties the cart only after confirming", async () => {
    useCartStore.getState().add(product(), 1);
    useCartStore.getState().add(product({ id: "p2", title: "Lápiz" }), 1);
    renderDrawer();

    await userEvent.click(screen.getByRole("button", { name: "Vaciar carrito" }));
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Vaciar carrito" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Vaciar carrito" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, vaciar" }));
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("orders by WhatsApp with what is in the cart, and keeps the cart", async () => {
    useCartStore.getState().add(product(), 2);
    renderDrawer();

    const link = screen.getByRole("link", { name: "Pedir por WhatsApp" });
    const text = new URL(link.getAttribute("href") ?? "").searchParams.get("text");

    expect(text).toContain("• 2× Cuaderno A4 — $ 19.600");
    expect(text).toContain("Total: $ 19.600");
    await userEvent.click(link);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
