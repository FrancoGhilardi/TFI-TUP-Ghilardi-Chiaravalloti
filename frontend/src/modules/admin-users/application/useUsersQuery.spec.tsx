import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUsersQuery } from "./useUsersQuery";

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

describe("useUsersQuery", () => {
  it("reads the query from the address", () => {
    search = "q=marta&rol=vendedor&estado=bajas&pagina=3";

    const { result } = renderHook(() => useUsersQuery());

    expect(result.current.query).toEqual({ q: "marta", role: "vendedor", state: "bajas", page: 3 });
  });

  it("goes to the new address, keeping the rest of the query and leaving the page", () => {
    search = "q=marta&pagina=3";
    const { result } = renderHook(() => useUsersQuery());

    result.current.go({ state: "bajas" });

    expect(push).toHaveBeenCalledWith("/admin/usuarios?q=marta&estado=bajas");
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes to another page when it is the page that changes", () => {
    search = "rol=admin";
    const { result } = renderHook(() => useUsersQuery());

    result.current.go({ page: 2 });

    expect(push).toHaveBeenCalledWith("/admin/usuarios?rol=admin&pagina=2");
  });

  it("can take the place of the current entry of the history", () => {
    const { result } = renderHook(() => useUsersQuery());

    result.current.go({ q: "ana" }, { replace: true });

    expect(replace).toHaveBeenCalledWith("/admin/usuarios?q=ana");
    expect(push).not.toHaveBeenCalled();
  });
});
