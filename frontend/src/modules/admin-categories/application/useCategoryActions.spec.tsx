import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { adminCategoriesApi } from "../infrastructure/admin-categories-client";
import { useCategoryActions } from "./useCategoryActions";

vi.mock("../infrastructure/admin-categories-client", () => ({
  adminCategoriesApi: { remove: vi.fn(), restore: vi.fn() },
}));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderActions = () =>
  renderHook(() => ({ ...useCategoryActions(), queryClient: useQueryClient() }), {
    wrapper: QueryProvider,
  });

beforeEach(() => {
  vi.mocked(adminCategoriesApi.remove).mockReset();
  vi.mocked(adminCategoriesApi.restore).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useCategoryActions", () => {
  it("deletes, tells it and reads the categories again", async () => {
    vi.mocked(adminCategoriesApi.remove).mockResolvedValue(undefined);
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current.remove("c1"));

    expect(adminCategoriesApi.remove).toHaveBeenCalledWith("c1");
    expect(toast.success).toHaveBeenCalledWith("Categoría dada de baja");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-categories"] });
  });

  it("restores and tells it", async () => {
    vi.mocked(adminCategoriesApi.restore).mockResolvedValue(undefined);
    const { result } = renderActions();

    await act(() => result.current.restore("c1"));

    expect(adminCategoriesApi.restore).toHaveBeenCalledWith("c1");
    expect(toast.success).toHaveBeenCalledWith("Categoría reactivada");
  });

  it("gives the API's reason and how many block a delete it refuses", async () => {
    vi.mocked(adminCategoriesApi.remove).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "CATEGORY_HAS_ACTIVE_CHILDREN",
        message: "La categoría tiene subcategorías.",
        details: { count: 3 },
      }),
    );
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current.remove("c1"));

    expect(toast.error).toHaveBeenCalledWith(
      "La categoría tiene subcategorías. Hay 3 elementos que la bloquean.",
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-categories"] });
  });

  it("gives only the API's reason for a refusal to restore", async () => {
    vi.mocked(adminCategoriesApi.restore).mockRejectedValue(
      new ApiError({
        status: 409,
        code: "CATEGORY_NAME_IN_USE",
        message: "Ese nombre ya lo usa otra categoría.",
      }),
    );
    const { result } = renderActions();

    await act(() => result.current.restore("c1"));

    expect(toast.error).toHaveBeenCalledWith("Ese nombre ya lo usa otra categoría.");
  });

  it("says something generic when the failure is not the API's", async () => {
    vi.mocked(adminCategoriesApi.remove).mockRejectedValue(new TypeError("boom"));
    const { result } = renderActions();

    await act(() => result.current.remove("c1"));

    expect(toast.error).toHaveBeenCalledWith("No pudimos completar la acción. Probá de nuevo.");
  });

  it("marks the category as pending while its request is on its way, and only that one", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminCategoriesApi.remove).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.remove("c1");
    });

    await waitFor(() => expect(result.current.isPending("c1")).toBe(true));
    expect(result.current.isPending("c2")).toBe(false);
    await act(async () => finish());
    expect(result.current.isPending("c1")).toBe(false);
  });

  it("makes one request when the same category is asked twice at once", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminCategoriesApi.remove).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.remove("c1");
      void result.current.remove("c1");
    });
    await act(async () => finish());

    expect(adminCategoriesApi.remove).toHaveBeenCalledTimes(1);
  });

  it("lets two different categories be handled at the same time", async () => {
    vi.mocked(adminCategoriesApi.remove).mockResolvedValue(undefined);
    const { result } = renderActions();

    await act(async () => {
      await Promise.all([result.current.remove("c1"), result.current.remove("c2")]);
    });

    expect(adminCategoriesApi.remove).toHaveBeenCalledTimes(2);
  });
});
