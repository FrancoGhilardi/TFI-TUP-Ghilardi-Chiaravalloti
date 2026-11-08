import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { adminProductImagesApi as api } from "../infrastructure/admin-product-images-client";
import { useImageActions } from "./useImageActions";

vi.mock("../infrastructure/admin-product-images-client", () => ({
  adminProductImagesApi: {
    add: vi.fn(),
    replaceFile: vi.fn(),
    reorder: vi.fn(),
    changeAltText: vi.fn(),
    retry: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const png = new File(["x"], "a.png", { type: "image/png" });

const renderActions = () =>
  renderHook(() => ({ ...useImageActions("p1"), queryClient: useQueryClient() }), {
    wrapper: QueryProvider,
  });

beforeEach(() => {
  for (const call of Object.values(api)) {
    const mocked = vi.mocked(call as () => Promise<void>);
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
  }
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useImageActions", () => {
  it.each([
    [
      "adds an image",
      (a: ReturnType<typeof useImageActions>) => a.add(png, "Tapa"),
      () => expect(api.add).toHaveBeenCalledWith("p1", png, "Tapa"),
      "Imagen agregada",
    ],
    [
      "replaces a file",
      (a: ReturnType<typeof useImageActions>) => a.replace("i1", png),
      () => expect(api.replaceFile).toHaveBeenCalledWith("p1", "i1", png),
      "Imagen reemplazada: se está procesando",
    ],
    [
      "reorders",
      (a: ReturnType<typeof useImageActions>) => a.reorder(["i2", "i1"]),
      () => expect(api.reorder).toHaveBeenCalledWith("p1", ["i2", "i1"]),
      "Orden de las imágenes actualizado",
    ],
    [
      "changes the alternative text",
      (a: ReturnType<typeof useImageActions>) => a.changeAltText("i1", "Tapa"),
      () => expect(api.changeAltText).toHaveBeenCalledWith("p1", "i1", "Tapa"),
      "Texto alternativo guardado",
    ],
    [
      "retries",
      (a: ReturnType<typeof useImageActions>) => a.retry("i1"),
      () => expect(api.retry).toHaveBeenCalledWith("p1", "i1"),
      "Volvemos a procesar la imagen",
    ],
    [
      "deletes",
      (a: ReturnType<typeof useImageActions>) => a.remove("i1"),
      () => expect(api.remove).toHaveBeenCalledWith("p1", "i1"),
      "Imagen eliminada",
    ],
  ])("%s, tells it and reads the images again", async (_name, act_, expectCall, message) => {
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => act_(result.current));

    expectCall();
    expect(toast.success).toHaveBeenCalledWith(message);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-products", "images", "p1"] });
  });

  it("shows the API's message when it refuses, and still reads the images again", async () => {
    vi.mocked(api.remove).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "LAST_PRODUCT_IMAGE",
        message: "Necesita al menos una imagen.",
      }),
    );
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current.remove("i1"));

    expect(toast.error).toHaveBeenCalledWith("Necesita al menos una imagen.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalled();
  });

  it("says something generic when the failure is not the API's", async () => {
    vi.mocked(api.retry).mockRejectedValue(new TypeError("boom"));
    const { result } = renderActions();

    await act(() => result.current.retry("i1"));

    expect(toast.error).toHaveBeenCalledWith(
      "No pudimos completar la acción sobre la imagen. Probá de nuevo.",
    );
  });

  it("marks an image as pending while its request is on its way, and only that one", async () => {
    let finish: () => void = () => {};
    vi.mocked(api.remove).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.remove("i1");
    });

    await waitFor(() => expect(result.current.isPending("i1")).toBe(true));
    expect(result.current.isPending("i2")).toBe(false);
    await act(async () => finish());
    expect(result.current.isPending("i1")).toBe(false);
  });

  it("makes one request when the same image is asked twice at once", async () => {
    let finish: () => void = () => {};
    vi.mocked(api.retry).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.retry("i1");
      void result.current.retry("i1");
    });
    await act(async () => finish());

    expect(api.retry).toHaveBeenCalledTimes(1);
  });

  it("treats adding and reordering as actions on the whole set", async () => {
    let finish: () => void = () => {};
    vi.mocked(api.add).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.add(png, "");
    });

    await waitFor(() => expect(result.current.isPending("")).toBe(true));
    await act(async () => finish());
  });
});
