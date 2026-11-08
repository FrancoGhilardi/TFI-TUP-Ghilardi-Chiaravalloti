import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { adminProductsApi } from "../infrastructure/admin-products-client";
import { useRelatedSearch } from "./useRelatedSearch";

vi.mock("../infrastructure/admin-products-client", () => ({ adminProductsApi: { list: vi.fn() } }));

const item = (id: string, title = `Producto ${id}`) => ({ id, title, sku: `LMS-${id}` }) as never;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(adminProductsApi.list).mockReset();
  vi.mocked(adminProductsApi.list).mockResolvedValue({
    total: 3,
    items: [item("p1"), item("p2"), item("p3")],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const search = (text: string, excluded: string[] = []) =>
  renderHook(({ typed }) => useRelatedSearch(typed, excluded), {
    wrapper: QueryProvider,
    initialProps: { typed: text },
  });

describe("useRelatedSearch", () => {
  it("lists current products by title, leaving out the ones to exclude", async () => {
    const { result } = search("", ["p2"]);

    await waitFor(() => expect(result.current.results.map(({ id }) => id)).toEqual(["p1", "p3"]));
    expect(adminProductsApi.list).toHaveBeenCalledWith(
      { q: undefined, sortBy: "TITLE", sortDir: "ASC", limit: 11 },
      expect.any(AbortSignal),
    );
  });

  it("waits for the typing to pause before asking, and asks once", async () => {
    const { rerender } = search("");
    await waitFor(() => expect(adminProductsApi.list).toHaveBeenCalledTimes(1));

    rerender({ typed: "r" });
    rerender({ typed: "re" });
    rerender({ typed: "reg" });
    expect(adminProductsApi.list).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(300));

    await waitFor(() => expect(adminProductsApi.list).toHaveBeenCalledTimes(2));
    expect(adminProductsApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "reg" }),
      expect.any(AbortSignal),
    );
  });

  it("says it is searching until the pause is over and the answer is in", async () => {
    const { result, rerender } = search("");
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ typed: "reg" });

    expect(result.current.isLoading).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(300));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("tells when the search failed and can try again", async () => {
    vi.mocked(adminProductsApi.list).mockRejectedValueOnce(new Error("boom"));
    const { result } = search("");
    await waitFor(() => expect(result.current.isError).toBe(true));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.results).toHaveLength(3);
  });

  it("asks for as many more as will be left out, so the list keeps its length", async () => {
    search("", ["p1", "p2", "p3", "p4", "p5"]);

    await waitFor(() => expect(adminProductsApi.list).toHaveBeenCalled());
    expect(adminProductsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 15 }),
      expect.any(AbortSignal),
    );
  });
});
