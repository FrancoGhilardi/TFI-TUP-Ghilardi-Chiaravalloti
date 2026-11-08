import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { adminProductsApi } from "../infrastructure/admin-products-client";
import { useProduct } from "./useProduct";

vi.mock("../infrastructure/admin-products-client", () => ({ adminProductsApi: { get: vi.fn() } }));

beforeEach(() => {
  vi.mocked(adminProductsApi.get).mockReset();
});

describe("useProduct", () => {
  it("reads the product asked for", async () => {
    vi.mocked(adminProductsApi.get).mockResolvedValue({ id: "p1", title: "Cuaderno" } as never);

    const { result } = renderHook(() => useProduct("p1"), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.data).toMatchObject({ id: "p1" }));
    expect(adminProductsApi.get).toHaveBeenCalledWith("p1", expect.any(AbortSignal));
  });

  it("keeps the API's error, so the screen can tell a missing product from a failure", async () => {
    vi.mocked(adminProductsApi.get).mockRejectedValue(
      new ApiError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "No existe." }),
    );

    const { result } = renderHook(() => useProduct("p1"), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404, code: "PRODUCT_NOT_FOUND" });
  });
});
