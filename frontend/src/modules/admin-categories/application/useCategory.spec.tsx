import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { adminCategoriesApi } from "../infrastructure/admin-categories-client";
import { useCategory } from "./useCategory";

vi.mock("../infrastructure/admin-categories-client", () => ({
  adminCategoriesApi: { get: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(adminCategoriesApi.get).mockReset();
});

describe("useCategory", () => {
  it("reads the category asked for", async () => {
    vi.mocked(adminCategoriesApi.get).mockResolvedValue({ id: "c1", name: "Libros" } as never);

    const { result } = renderHook(() => useCategory("c1"), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.data).toMatchObject({ id: "c1" }));
    expect(adminCategoriesApi.get).toHaveBeenCalledWith("c1", expect.any(AbortSignal));
  });

  it("keeps the API's error, so the screen can tell a missing category from a failure", async () => {
    vi.mocked(adminCategoriesApi.get).mockRejectedValue(
      new ApiError({ status: 404, code: "CATEGORY_NOT_FOUND", message: "No existe." }),
    );

    const { result } = renderHook(() => useCategory("c1"), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404, code: "CATEGORY_NOT_FOUND" });
  });
});
