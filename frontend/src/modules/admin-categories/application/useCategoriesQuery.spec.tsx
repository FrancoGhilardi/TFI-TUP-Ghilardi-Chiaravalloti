import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCategoriesQuery } from "./useCategoriesQuery";

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

describe("useCategoriesQuery", () => {
  it("reads the query from the address", () => {
    search = "q=libros&estado=bajas&pagina=3";

    const { result } = renderHook(() => useCategoriesQuery());

    expect(result.current.query).toMatchObject({ q: "libros", state: "bajas", page: 3 });
  });

  it("goes to the new address, keeping the rest of the query and leaving the page", () => {
    search = "q=libros&pagina=3";
    const { result } = renderHook(() => useCategoriesQuery());

    result.current.go({ state: "bajas" });

    expect(push).toHaveBeenCalledWith("/admin/categorias?q=libros&estado=bajas");
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes to another page when it is the page that changes", () => {
    search = "q=libros";
    const { result } = renderHook(() => useCategoriesQuery());

    result.current.go({ page: 2 });

    expect(push).toHaveBeenCalledWith("/admin/categorias?q=libros&pagina=2");
  });

  it("can take the place of the current entry of the history", () => {
    const { result } = renderHook(() => useCategoriesQuery());

    result.current.go({ q: "lapiz" }, { replace: true });

    expect(replace).toHaveBeenCalledWith("/admin/categorias?q=lapiz");
    expect(push).not.toHaveBeenCalled();
  });
});
