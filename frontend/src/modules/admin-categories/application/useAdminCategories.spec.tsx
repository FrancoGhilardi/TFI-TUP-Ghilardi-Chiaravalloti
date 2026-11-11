import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { EMPTY_CATEGORIES_QUERY } from "../domain/categories-query";
import { adminCategoriesApi } from "../infrastructure/admin-categories-client";
import { useAdminCategories } from "./useAdminCategories";

vi.mock("../infrastructure/admin-categories-client", () => ({
  adminCategoriesApi: { list: vi.fn() },
}));

const page = (name: string) => ({ total: 1, items: [{ id: name, name }] as never });

beforeEach(() => {
  vi.mocked(adminCategoriesApi.list).mockReset();
});

describe("useAdminCategories", () => {
  it("asks the API for what the query says", async () => {
    vi.mocked(adminCategoriesApi.list).mockResolvedValue(page("uno"));
    const query = { ...EMPTY_CATEGORIES_QUERY, q: "libros", state: "bajas" as const };

    const { result } = renderHook(() => useAdminCategories(query), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminCategoriesApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: "libros", status: "DELETED", page: 1, limit: 50 }),
      expect.any(AbortSignal),
    );
  });

  it("keeps showing the last page while the next one loads", async () => {
    vi.mocked(adminCategoriesApi.list).mockResolvedValueOnce(page("primera"));
    let finish: (value: ReturnType<typeof page>) => void = () => {};
    vi.mocked(adminCategoriesApi.list).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ pageNumber }) => useAdminCategories({ ...EMPTY_CATEGORIES_QUERY, page: pageNumber }),
      { wrapper: QueryProvider, initialProps: { pageNumber: 1 } },
    );
    await waitFor(() => expect(result.current.data?.items[0]).toMatchObject({ name: "primera" }));

    rerender({ pageNumber: 2 });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.items[0]).toMatchObject({ name: "primera" });
    finish(page("segunda"));
    await waitFor(() => expect(result.current.data?.items[0]).toMatchObject({ name: "segunda" }));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("tells when it could not be read", async () => {
    vi.mocked(adminCategoriesApi.list).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useAdminCategories(EMPTY_CATEGORIES_QUERY), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
