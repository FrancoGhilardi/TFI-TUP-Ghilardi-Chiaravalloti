import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import type { AdminProductImage } from "../domain/admin-product";
import { adminProductImagesApi } from "../infrastructure/admin-product-images-client";
import { useProductImages } from "./useProductImages";

vi.mock("../infrastructure/admin-product-images-client", () => ({
  adminProductImagesApi: { list: vi.fn() },
}));

const image = (status: AdminProductImage["status"]): AdminProductImage => ({
  id: "i1",
  position: 1,
  altText: null,
  mimeType: "image/png",
  sizeBytes: 10,
  status,
  previewUrl: null,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(adminProductImagesApi.list).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useProductImages", () => {
  it("reads the images of the product", async () => {
    vi.mocked(adminProductImagesApi.list).mockResolvedValue([image("PROCESSED")]);

    const { result } = renderHook(() => useProductImages("p1"), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(adminProductImagesApi.list).toHaveBeenCalledWith("p1", expect.any(AbortSignal));
  });

  it("reads them again every few seconds while one is still processing, and stops when none is", async () => {
    vi.mocked(adminProductImagesApi.list)
      .mockResolvedValueOnce([image("PENDING")])
      .mockResolvedValueOnce([image("PENDING")])
      .mockResolvedValue([image("PROCESSED")]);
    const { result } = renderHook(() => useProductImages("p1"), { wrapper: QueryProvider });
    await waitFor(() => expect(adminProductImagesApi.list).toHaveBeenCalledTimes(1));

    await act(() => vi.advanceTimersByTimeAsync(3000));
    await waitFor(() => expect(adminProductImagesApi.list).toHaveBeenCalledTimes(2));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    await waitFor(() => expect(result.current.data?.[0].status).toBe("PROCESSED"));
    const calls = vi.mocked(adminProductImagesApi.list).mock.calls.length;

    await act(() => vi.advanceTimersByTimeAsync(20_000));

    expect(adminProductImagesApi.list).toHaveBeenCalledTimes(calls);
  });

  it("does not poll when no image is processing", async () => {
    vi.mocked(adminProductImagesApi.list).mockResolvedValue([image("FAILED"), image("PROCESSED")]);
    renderHook(() => useProductImages("p1"), { wrapper: QueryProvider });
    await waitFor(() => expect(adminProductImagesApi.list).toHaveBeenCalledTimes(1));

    await act(() => vi.advanceTimersByTimeAsync(20_000));

    expect(adminProductImagesApi.list).toHaveBeenCalledTimes(1);
  });
});
