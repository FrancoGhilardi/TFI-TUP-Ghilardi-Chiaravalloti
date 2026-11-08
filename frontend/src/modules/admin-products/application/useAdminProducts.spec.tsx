import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { EMPTY_PRODUCTS_QUERY } from "../domain/products-query";
import { adminProductsApi } from "../infrastructure/admin-products-client";
import { useAdminProducts } from "./useAdminProducts";

vi.mock("../infrastructure/admin-products-client", () => ({
  adminProductsApi: { list: vi.fn() },
}));

const page = (title: string) => ({
  total: 1,
  items: [{ id: title, title }] as never,
});

beforeEach(() => {
  vi.mocked(adminProductsApi.list).mockReset();
});

describe("useAdminProducts", () => {
  it("asks the API for what the query says", async () => {
    vi.mocked(adminProductsApi.list).mockResolvedValue(page("uno"));
    const query = { ...EMPTY_PRODUCTS_QUERY, q: "regla", state: "bajas" as const };

    const { result } = renderHook(() => useAdminProducts(query), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminProductsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: "regla", status: "DELETED", page: 1, limit: 20 }),
      expect.any(AbortSignal),
    );
  });

  it("keeps showing the last page while the next one loads", async () => {
    vi.mocked(adminProductsApi.list).mockResolvedValueOnce(page("primera"));
    let finish: (value: ReturnType<typeof page>) => void = () => {};
    vi.mocked(adminProductsApi.list).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ pageNumber }) => useAdminProducts({ ...EMPTY_PRODUCTS_QUERY, page: pageNumber }),
      {
        wrapper: QueryProvider,
        initialProps: { pageNumber: 1 },
      },
    );
    await waitFor(() => expect(result.current.data?.items[0]).toMatchObject({ title: "primera" }));

    rerender({ pageNumber: 2 });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.items[0]).toMatchObject({ title: "primera" });
    finish(page("segunda"));
    await waitFor(() => expect(result.current.data?.items[0]).toMatchObject({ title: "segunda" }));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("tells when it could not be read", async () => {
    vi.mocked(adminProductsApi.list).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useAdminProducts(EMPTY_PRODUCTS_QUERY), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
