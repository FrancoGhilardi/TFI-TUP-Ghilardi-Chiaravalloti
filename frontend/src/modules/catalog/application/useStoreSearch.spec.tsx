import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchStore } from "../infrastructure/search-api";
import type { SearchSuggestions } from "../domain/search-term";
import { useStoreSearch } from "./useStoreSearch";

vi.mock("../infrastructure/search-api", () => ({ searchStore: vi.fn() }));

const answer = (name: string): SearchSuggestions => ({
  products: [],
  categories: [{ id: name, name, slug: name }],
});

// One client per test: a client rebuilt on every render would forget the answers it holds.
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

// The debounce, then the time the query cache needs to deliver the answer to the hook.
const pause = async () => {
  await act(() => vi.advanceTimersByTimeAsync(300));
  await act(() => vi.advanceTimersByTimeAsync(100));
};

describe("useStoreSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(searchStore).mockReset();
    client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks once, with the trimmed term, after a burst of typing", async () => {
    vi.mocked(searchStore).mockResolvedValue(answer("cuadernos"));
    const { result, rerender } = renderHook(({ text }) => useStoreSearch(text), {
      wrapper,
      initialProps: { text: "" },
    });

    for (const text of ["cu", "cua", "cuad", " cuad "]) {
      rerender({ text });
      await act(() => vi.advanceTimersByTimeAsync(100));
    }
    expect(searchStore).not.toHaveBeenCalled();

    await pause();

    expect(result.current.status).toBe("success");
    expect(searchStore).toHaveBeenCalledTimes(1);
    expect(searchStore).toHaveBeenCalledWith("cuad", expect.any(AbortSignal));
  });

  it.each(["", "a", "   "])("stays idle and asks nothing for %j", async (text) => {
    const { result } = renderHook(() => useStoreSearch(text), { wrapper });

    await pause();

    expect(result.current).toMatchObject({ status: "idle", term: undefined });
    expect(searchStore).not.toHaveBeenCalled();
  });

  it("keeps the previous suggestions while the next term loads", async () => {
    vi.mocked(searchStore).mockResolvedValueOnce(answer("cuadernos"));
    const { result, rerender } = renderHook(({ text }) => useStoreSearch(text), {
      wrapper,
      initialProps: { text: "cuaderno" },
    });
    await pause();
    expect(result.current.status).toBe("success");

    vi.mocked(searchStore).mockReturnValueOnce(new Promise(() => {}));
    rerender({ text: "lapiz" });
    await pause();

    expect(result.current.status).toBe("loading");
    expect(result.current.suggestions).toEqual(answer("cuadernos"));
  });

  it("aborts the request of the term it replaces", async () => {
    vi.mocked(searchStore).mockReturnValue(new Promise(() => {}));
    const { rerender } = renderHook(({ text }) => useStoreSearch(text), {
      wrapper,
      initialProps: { text: "cuaderno" },
    });
    await pause();
    const [, firstSignal] = vi.mocked(searchStore).mock.calls[0];

    rerender({ text: "lapiz" });
    await pause();

    expect(firstSignal?.aborted).toBe(true);
  });

  it("does not ask again for a term it already has", async () => {
    vi.mocked(searchStore).mockResolvedValue(answer("cuadernos"));
    const { result, rerender } = renderHook(({ text }) => useStoreSearch(text), {
      wrapper,
      initialProps: { text: "cuaderno" },
    });
    await pause();
    expect(result.current.status).toBe("success");

    rerender({ text: "lapiz" });
    await pause();
    rerender({ text: "cuaderno" });
    await pause();

    expect(result.current.term).toBe("cuaderno");
    expect(searchStore).toHaveBeenCalledTimes(2);
  });

  it("reports a failure and asks again on retry", async () => {
    vi.mocked(searchStore).mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useStoreSearch("cuaderno"), { wrapper });
    await pause();
    expect(result.current.status).toBe("error");

    vi.mocked(searchStore).mockResolvedValueOnce(answer("cuadernos"));
    act(() => result.current.retry());
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(result.current.status).toBe("success");
    expect(searchStore).toHaveBeenCalledTimes(2);
  });

  it("goes idle at once when the field is cleared, without waiting for the pause", async () => {
    vi.mocked(searchStore).mockResolvedValue(answer("cuadernos"));
    const { result, rerender } = renderHook(({ text }) => useStoreSearch(text), {
      wrapper,
      initialProps: { text: "cuaderno" },
    });
    await pause();
    expect(result.current.status).toBe("success");

    rerender({ text: "" });

    expect(result.current).toMatchObject({
      status: "idle",
      term: undefined,
      suggestions: undefined,
    });
  });

  it("shows nothing of the old term after the field was cleared and a new one typed", async () => {
    vi.mocked(searchStore).mockResolvedValueOnce(answer("libros"));
    const { result, rerender } = renderHook(({ text }) => useStoreSearch(text), {
      wrapper,
      initialProps: { text: "libro" },
    });
    await pause();
    expect(result.current.suggestions).toEqual(answer("libros"));

    rerender({ text: "" });
    await pause();
    vi.mocked(searchStore).mockReturnValueOnce(new Promise(() => {}));
    rerender({ text: "lapiz" });
    await pause();

    expect(result.current).toMatchObject({ status: "loading", suggestions: undefined });
  });
});
