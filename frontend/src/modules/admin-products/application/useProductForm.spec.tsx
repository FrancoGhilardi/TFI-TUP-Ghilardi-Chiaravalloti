import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { EMPTY_PRODUCT_FORM, type ProductFormValues } from "../domain/product-form";
import { adminProductsApi } from "../infrastructure/admin-products-client";
import { useProductForm } from "./useProductForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-products-client", () => ({
  adminProductsApi: { create: vi.fn(), update: vi.fn() },
}));

const photo = new File(["foto"], "foto.png", { type: "image/png" });

const complete = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  ...EMPTY_PRODUCT_FORM,
  title: "Cuaderno rayado",
  price: "1500",
  stock: "10",
  categoryIds: ["c1"],
  primaryCategoryId: "c1",
  images: [{ key: "k1", file: photo, altText: "Tapa" }],
  ...overrides,
});

const refusal = (
  code: string,
  message: string,
  status = 422,
  details?: { field: string; messages: string[] }[],
) => new ApiError({ status, code, message, details });

const renderCreate = () =>
  renderHook(() => useProductForm({ mode: "create" }), { wrapper: QueryProvider });

const renderEdit = (initial: ProductFormValues) =>
  renderHook(() => useProductForm({ mode: "edit", productId: "p1", initial }), {
    wrapper: QueryProvider,
  });

const fill = (hook: ReturnType<typeof renderCreate>, values: ProductFormValues) =>
  act(() => hook.result.current.form.reset(values));

beforeEach(() => {
  push.mockReset();
  vi.mocked(adminProductsApi.create).mockReset();
  vi.mocked(adminProductsApi.update).mockReset();
  vi.mocked(adminProductsApi.create).mockResolvedValue(undefined);
  vi.mocked(adminProductsApi.update).mockResolvedValue(undefined);
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useProductForm creating", () => {
  it("sends the product and its images, tells it and goes back to the list", async () => {
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    expect(adminProductsApi.create).toHaveBeenCalledTimes(1);
    const [request, files] = vi.mocked(adminProductsApi.create).mock.calls[0];
    expect(request).toMatchObject({
      title: "Cuaderno rayado",
      price: "1500.00",
      stock: 10,
      categoryIds: ["c1"],
      primaryCategoryId: "c1",
      imageAltTexts: ["Tapa"],
    });
    expect(files).toEqual([photo]);
    expect(toast.success).toHaveBeenCalledWith("Producto creado");
    expect(push).toHaveBeenCalledWith("/admin/productos");
  });

  it("does not send anything while the form is not valid, and marks what is missing", async () => {
    const hook = renderCreate();
    fill(hook, complete({ title: "", images: [] }));

    await act(() => hook.result.current.submit());

    expect(adminProductsApi.create).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(hook.result.current.errors.title?.message).toBe("Escribí el título.");
    expect(hook.result.current.errors.images?.message).toBe("Sumá al menos una imagen.");
  });

  it("makes one request when it is submitted twice at once", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminProductsApi.create).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const hook = renderCreate();
    fill(hook, complete());

    act(() => {
      void hook.result.current.submit();
      void hook.result.current.submit();
    });
    await waitFor(() => expect(hook.result.current.isSaving).toBe(true));
    await act(async () => finish());

    expect(adminProductsApi.create).toHaveBeenCalledTimes(1);
  });

  it("sends nothing more once it was saved, while the page is on its way out", async () => {
    const hook = renderCreate();
    fill(hook, complete());
    await act(() => hook.result.current.submit());

    await act(() => hook.result.current.submit());

    expect(adminProductsApi.create).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isSaving).toBe(true);
  });

  it("goes back to the list without waiting for the lists to be read again", async () => {
    const hook = renderHook(
      () => ({ ...useProductForm({ mode: "create" }), queryClient: useQueryClient() }),
      { wrapper: QueryProvider },
    );
    vi.spyOn(hook.result.current.queryClient, "invalidateQueries").mockReturnValue(
      new Promise(() => {}),
    );
    act(() => hook.result.current.form.reset(complete()));

    await act(() => hook.result.current.submit());

    expect(toast.success).toHaveBeenCalledWith("Producto creado");
    expect(push).toHaveBeenCalledWith("/admin/productos");
  });

  it("puts what the server refuses next to its fields, keeps the values and stays on the form", async () => {
    vi.mocked(adminProductsApi.create).mockRejectedValue(
      refusal("VALIDATION_FAILED", "Revisá los datos.", 400, [
        { field: "title", messages: ["Ese título ya existe."] },
        { field: "relatedProductIds.0", messages: ["Ese producto no está disponible."] },
      ]),
    );
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    const { errors } = hook.result.current;
    expect(errors.title?.message).toBe("Ese título ya existe.");
    expect(errors.relatedProducts?.message).toBe("Ese producto no está disponible.");
    expect(hook.result.current.general).toBeNull();
    expect(hook.result.current.form.getValues("title")).toBe("Cuaderno rayado");
    expect(hook.result.current.form.getValues("images")).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "No pudimos guardar el producto. Revisá los datos marcados.",
    );
  });

  it("maps a domain error to its field", async () => {
    vi.mocked(adminProductsApi.create).mockRejectedValue(
      refusal("SALE_PRICE_NOT_LOWER", "El precio de oferta tiene que ser menor."),
    );
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    expect(hook.result.current.errors.salePrice?.message).toBe(
      "El precio de oferta tiene que ser menor.",
    );
  });

  it("shows a failure that belongs to no field above the form and in a message", async () => {
    vi.mocked(adminProductsApi.create).mockRejectedValue(
      refusal("IMAGE_UPLOAD_FAILED", "No pudimos subir las imágenes.", 502),
    );
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    expect(hook.result.current.general).toBe("No pudimos subir las imágenes.");
    expect(toast.error).toHaveBeenCalledWith("No pudimos subir las imágenes.");
    expect(hook.result.current.form.getValues("images")).toHaveLength(1);
  });

  it("clears the notice of a failure when it is tried again", async () => {
    vi.mocked(adminProductsApi.create).mockRejectedValueOnce(
      refusal("IMAGE_UPLOAD_FAILED", "No pudimos subir las imágenes.", 502),
    );
    const hook = renderCreate();
    fill(hook, complete());
    await act(() => hook.result.current.submit());

    await act(() => hook.result.current.submit());

    expect(hook.result.current.general).toBeNull();
    expect(push).toHaveBeenCalledWith("/admin/productos");
  });

  it("is clean at first, dirty once something is typed and clean again after saving", async () => {
    const hook = renderCreate();
    expect(hook.result.current.changed).toBe(false);

    act(() => hook.result.current.form.setValue("title", "Otro", { shouldDirty: true }));
    expect(hook.result.current.changed).toBe(true);

    fill(hook, complete());
    await act(() => hook.result.current.submit());
    expect(hook.result.current.changed).toBe(false);
  });

  it("asks the browser to warn before leaving only while there are unsaved changes", () => {
    const hook = renderCreate();
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(leave()).toBe(false);

    act(() => hook.result.current.form.setValue("title", "Otro", { shouldDirty: true }));

    expect(leave()).toBe(true);
  });

  it("can always be saved when creating", () => {
    expect(renderCreate().result.current.canSave).toBe(true);
  });
});

describe("useProductForm editing", () => {
  const initial = complete({ images: [], description: "Tapa dura" });

  it("has nothing to save until something changes", async () => {
    const hook = renderEdit(initial);
    expect(hook.result.current.canSave).toBe(false);

    await act(() => hook.result.current.submit());

    expect(adminProductsApi.update).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("sends only what changed, tells it and goes back to the list", async () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("stock", "3", { shouldDirty: true }));
    expect(hook.result.current.canSave).toBe(true);
    await act(() => hook.result.current.submit());

    expect(adminProductsApi.update).toHaveBeenCalledWith("p1", { stock: 3 });
    expect(toast.success).toHaveBeenCalledWith("Cambios guardados");
    expect(push).toHaveBeenCalledWith("/admin/productos");
  });

  it("does not send a change that makes the form invalid", async () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("price", "abc", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(adminProductsApi.update).not.toHaveBeenCalled();
    expect(hook.result.current.errors.price).toBeDefined();
  });

  it("shows the server's refusal at the field and keeps the change", async () => {
    vi.mocked(adminProductsApi.update).mockRejectedValue(
      refusal("CATEGORY_UNAVAILABLE", "Esa categoría no está disponible."),
    );
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("stock", "3", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(hook.result.current.errors.categoryIds?.message).toBe(
      "Esa categoría no está disponible.",
    );
    expect(hook.result.current.form.getValues("stock")).toBe("3");
    expect(hook.result.current.canSave).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("can save a product whose offer end passed, as long as that day is not touched", async () => {
    const expired = complete({
      images: [],
      isOnSale: true,
      salePrice: "1000",
      saleEndsAt: "2020-01-01",
    });
    const hook = renderEdit(expired);

    act(() => hook.result.current.form.setValue("stock", "3", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(adminProductsApi.update).toHaveBeenCalledWith("p1", { stock: 3 });
  });

  it("is not changed when a value is only worded differently", () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("price", "1500,00", { shouldDirty: true }));

    expect(hook.result.current.changed).toBe(false);
  });
});
