import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useListQuery } from "./useListQuery";

const push = vi.fn();
const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

interface Query {
  q: string;
}

const parse = (params: { get(name: string): string | null }): Query => ({
  q: params.get("q") ?? "",
});
const hrefOf = (query: Query, changes: Partial<Query>) => `/lista?q=${changes.q ?? query.q}`;

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  search = "";
});

describe("useListQuery", () => {
  it("reads the query with the rules it is given", () => {
    search = "q=hola";

    const { result } = renderHook(() => useListQuery(parse, hrefOf));

    expect(result.current.query).toEqual({ q: "hola" });
  });

  it("goes to the address its rules build, adding an entry to the history", () => {
    const { result } = renderHook(() => useListQuery(parse, hrefOf));

    result.current.go({ q: "chau" });

    expect(push).toHaveBeenCalledWith("/lista?q=chau");
    expect(replace).not.toHaveBeenCalled();
  });

  it("can take the place of the current entry of the history", () => {
    const { result } = renderHook(() => useListQuery(parse, hrefOf));

    result.current.go({ q: "chau" }, { replace: true });

    expect(replace).toHaveBeenCalledWith("/lista?q=chau");
    expect(push).not.toHaveBeenCalled();
  });
});
