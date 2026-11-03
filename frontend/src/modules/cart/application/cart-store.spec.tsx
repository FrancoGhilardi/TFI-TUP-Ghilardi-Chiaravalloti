import { renderToString } from "react-dom/server";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartProduct } from "../domain/cart";
import { CART_STORAGE_KEY } from "../infrastructure/cart-storage";
import { useCartStore } from "./cart-store";
import { useAddToCart } from "./useAddToCart";
import { useCartCount } from "./useCartCount";
import { useCartSync } from "./useCartSync";

const product = (overrides: Partial<CartProduct> = {}): CartProduct => ({
  id: "p1",
  slug: "cuaderno-a4",
  title: "Cuaderno A4",
  price: "9800.00",
  stock: 5,
  imageUrl: "http://x/p1.webp",
  ...overrides,
});

const storedCart = () => JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "null");

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [], syncNotice: null });
});

describe("cart store", () => {
  it("changes quantities within the stock, removes and clears, and keeps it in the browser", () => {
    const { add, setQuantity, remove, clear } = useCartStore.getState();
    add(product({ stock: 4 }), 1);
    add(product({ id: "p2", slug: "otro" }), 1);

    setQuantity("p1", 9);
    expect(useCartStore.getState().items[0].quantity).toBe(4);
    expect(storedCart().state.items[0].quantity).toBe(4);

    remove("p1");
    expect(useCartStore.getState().items.map((item) => item.id)).toEqual(["p2"]);

    clear();
    expect(useCartStore.getState().items).toEqual([]);
    expect(storedCart().state.items).toEqual([]);
  });

  it("adds, reports how many went in and keeps only the items in the browser", () => {
    expect(useCartStore.getState().add(product(), 2)).toBe(2);
    expect(useCartStore.getState().add(product(), 9)).toBe(3);
    expect(useCartStore.getState().add(product(), 1)).toBe(0);

    const stored = storedCart();
    expect(stored.version).toBe(1);
    expect(Object.keys(stored.state)).toEqual(["items"]);
    expect(stored.state.items).toEqual([{ ...product(), quantity: 5 }]);
  });

  it("restores what was stored, dropping what is malformed", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { items: [{ ...product(), quantity: 3 }, { id: "x" }] },
      }),
    );

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().items).toEqual([{ ...product(), quantity: 3 }]);
  });

  it("restores an empty cart from something that is not a cart", async () => {
    localStorage.setItem(CART_STORAGE_KEY, "{not json");

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().items).toEqual([]);
  });

  it("keeps the cart in memory when the browser storage refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(useCartStore.getState().add(product(), 2)).toBe(2);
    useCartStore.getState().sync(product({ stock: 1 }));

    expect(useCartStore.getState().items[0].quantity).toBe(1);
    vi.restoreAllMocks();
  });

  it("syncs a product in the cart and keeps the notice out of the storage", () => {
    useCartStore.getState().add(product(), 4);

    useCartStore.getState().sync(product({ stock: 2 }));

    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(useCartStore.getState().syncNotice).toMatchObject({ kind: "adjusted", quantity: 2 });
    expect(JSON.stringify(storedCart())).not.toContain("syncNotice");
  });

  it("clears the notice when a later sync has nothing to say", () => {
    useCartStore.getState().add(product(), 4);
    useCartStore.getState().sync(product({ stock: 2 }));

    useCartStore.getState().sync(product({ stock: 2 }));

    expect(useCartStore.getState().syncNotice).toBeNull();
  });
});

describe("useCartCount", () => {
  it("counts the units and follows the cart", () => {
    const { result } = renderHook(() => useCartCount());
    expect(result.current).toBe(0);

    act(() => void useCartStore.getState().add(product(), 3));

    expect(result.current).toBe(3);
  });

  it("renders nothing of a stored cart on the server pass", () => {
    useCartStore.setState({ items: [{ ...product(), quantity: 4 }] });
    const Count = () => <p>{useCartCount()}</p>;

    expect(renderToString(<Count />)).toBe("<p>0</p>");
  });
});

describe("useAddToCart", () => {
  it("starts at one and stays between one and the stock", () => {
    const { result } = renderHook(() => useAddToCart(product({ stock: 2 })));

    expect(result.current).toMatchObject({ quantity: 1, canDecrease: false, canIncrease: true });
    act(() => result.current.increase());
    expect(result.current).toMatchObject({ quantity: 2, canIncrease: false, canDecrease: true });
    act(() => result.current.decrease());
    expect(result.current.quantity).toBe(1);
  });

  it("clamps a quantity picked before the stock dropped", () => {
    const { result, rerender } = renderHook(({ stock }) => useAddToCart(product({ stock })), {
      initialProps: { stock: 5 },
    });
    act(() => result.current.increase());
    act(() => result.current.increase());
    expect(result.current.quantity).toBe(3);

    rerender({ stock: 2 });

    expect(result.current.quantity).toBe(2);
  });

  it("cannot add without stock", () => {
    const { result } = renderHook(() => useAddToCart(product({ stock: 0 })));

    expect(result.current).toMatchObject({ canAdd: false, canIncrease: false, quantity: 1 });
  });

  it("puts the picked quantity in the cart and reports each try", () => {
    const { result } = renderHook(() => useAddToCart(product({ stock: 3 })));
    act(() => result.current.increase());

    act(() => result.current.add());
    expect(result.current.outcome).toEqual({ attempt: 1, added: 2, requested: 2 });

    act(() => result.current.add());
    expect(result.current.outcome).toEqual({ attempt: 2, added: 1, requested: 2 });

    act(() => result.current.add());
    expect(result.current.outcome).toEqual({ attempt: 3, added: 0, requested: 2 });
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });
});

describe("useCartSync", () => {
  it("refreshes the product in the cart once, not on every render", () => {
    useCartStore.getState().add(product(), 4);
    const { rerender } = renderHook(({ stock }) => useCartSync(product({ stock })), {
      initialProps: { stock: 2 },
    });
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(useCartStore.getState().syncNotice).not.toBeNull();

    rerender({ stock: 2 });

    expect(useCartStore.getState().syncNotice).not.toBeNull();
  });

  it("drops the notice when the page closes", () => {
    useCartStore.getState().add(product(), 4);
    const { unmount } = renderHook(() => useCartSync(product({ stock: 2 })));
    expect(useCartStore.getState().syncNotice).not.toBeNull();

    unmount();

    expect(useCartStore.getState().syncNotice).toBeNull();
  });
});
