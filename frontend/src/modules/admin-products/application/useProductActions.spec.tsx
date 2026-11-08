import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { adminProductsApi } from "../infrastructure/admin-products-client";
import { useProductActions } from "./useProductActions";

vi.mock("../infrastructure/admin-products-client", () => ({
  adminProductsApi: { remove: vi.fn(), restore: vi.fn() },
}));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderActions = () =>
  renderHook(() => ({ ...useProductActions(), queryClient: useQueryClient() }), {
    wrapper: QueryProvider,
  });

beforeEach(() => {
  vi.mocked(adminProductsApi.remove).mockReset();
  vi.mocked(adminProductsApi.restore).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useProductActions", () => {
  it("deletes, tells it and reads the products again", async () => {
    vi.mocked(adminProductsApi.remove).mockResolvedValue(undefined);
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current.remove("p1"));

    expect(adminProductsApi.remove).toHaveBeenCalledWith("p1");
    expect(toast.success).toHaveBeenCalledWith("Producto dado de baja");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-products"] });
  });

  it("restores and tells it", async () => {
    vi.mocked(adminProductsApi.restore).mockResolvedValue(undefined);
    const { result } = renderActions();

    await act(() => result.current.restore("p1"));

    expect(adminProductsApi.restore).toHaveBeenCalledWith("p1");
    expect(toast.success).toHaveBeenCalledWith("Producto reactivado");
  });

  it("shows the API's own message when it refuses, and still reads the products again", async () => {
    vi.mocked(adminProductsApi.restore).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "PRODUCT_WITHOUT_CATEGORY",
        message: "Reactivá alguna de sus categorías primero.",
      }),
    );
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current.restore("p1"));

    expect(toast.error).toHaveBeenCalledWith("Reactivá alguna de sus categorías primero.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-products"] });
  });

  it("says something generic when the failure is not the API's", async () => {
    vi.mocked(adminProductsApi.remove).mockRejectedValue(new TypeError("boom"));
    const { result } = renderActions();

    await act(() => result.current.remove("p1"));

    expect(toast.error).toHaveBeenCalledWith("No pudimos completar la acción. Probá de nuevo.");
  });

  it("marks the product as pending while its request is on its way, and only that one", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminProductsApi.remove).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.remove("p1");
    });

    await waitFor(() => expect(result.current.isPending("p1")).toBe(true));
    expect(result.current.isPending("p2")).toBe(false);
    await act(async () => finish());
    expect(result.current.isPending("p1")).toBe(false);
  });

  it("makes one request when the same product is asked twice at once", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminProductsApi.remove).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.remove("p1");
      void result.current.remove("p1");
    });
    await act(async () => finish());

    expect(adminProductsApi.remove).toHaveBeenCalledTimes(1);
  });

  it("lets two different products be handled at the same time", async () => {
    vi.mocked(adminProductsApi.remove).mockResolvedValue(undefined);
    const { result } = renderActions();

    await act(async () => {
      await Promise.all([result.current.remove("p1"), result.current.remove("p2")]);
    });

    expect(adminProductsApi.remove).toHaveBeenCalledTimes(2);
  });
});
