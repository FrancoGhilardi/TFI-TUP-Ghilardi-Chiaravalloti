import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProductsQuery } from "./useProductsQuery";

const push = vi.fn();
const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  search = "";
});

describe("useProductsQuery", () => {
  it("reads the query from the address", () => {
    search = "q=regla&estado=bajas&pagina=3";

    const { result } = renderHook(() => useProductsQuery());

    expect(result.current.query).toMatchObject({ q: "regla", state: "bajas", page: 3 });
  });

  it("goes to the new address, keeping the rest of the query and leaving the page", () => {
    search = "q=regla&pagina=3";
    const { result } = renderHook(() => useProductsQuery());

    result.current.go({ featured: true });

    expect(push).toHaveBeenCalledWith("/admin/productos?q=regla&destacados=true");
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes to another page when it is the page that changes", () => {
    search = "q=regla";
    const { result } = renderHook(() => useProductsQuery());

    result.current.go({ page: 2 });

    expect(push).toHaveBeenCalledWith("/admin/productos?q=regla&pagina=2");
  });

  it("can take the place of the current entry of the history", () => {
    const { result } = renderHook(() => useProductsQuery());

    result.current.go({ q: "lapiz" }, { replace: true });

    expect(replace).toHaveBeenCalledWith("/admin/productos?q=lapiz");
    expect(push).not.toHaveBeenCalled();
  });
});
