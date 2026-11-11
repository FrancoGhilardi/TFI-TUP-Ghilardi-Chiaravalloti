import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { type CategoryFormValues, EMPTY_CATEGORY_FORM } from "../domain/category-form";
import { adminCategoriesApi } from "../infrastructure/admin-categories-client";
import { useCategoryForm } from "./useCategoryForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../infrastructure/admin-categories-client", () => ({
  adminCategoriesApi: { create: vi.fn(), update: vi.fn() },
}));

const complete = (overrides: Partial<CategoryFormValues> = {}): CategoryFormValues => ({
  ...EMPTY_CATEGORY_FORM,
  name: "Cuadernos",
  ...overrides,
});

const refusal = (
  code: string,
  message: string,
  status = 422,
  details?: { field: string; messages: string[] }[],
) => new ApiError({ status, code, message, details });

const renderCreate = () =>
  renderHook(() => useCategoryForm({ mode: "create" }), { wrapper: QueryProvider });

const renderEdit = (initial: CategoryFormValues) =>
  renderHook(() => useCategoryForm({ mode: "edit", categoryId: "c1", initial }), {
    wrapper: QueryProvider,
  });

const fill = (hook: ReturnType<typeof renderCreate>, values: CategoryFormValues) =>
  act(() => hook.result.current.form.reset(values));

beforeEach(() => {
  push.mockReset();
  vi.mocked(adminCategoriesApi.create).mockReset();
  vi.mocked(adminCategoriesApi.update).mockReset();
  vi.mocked(adminCategoriesApi.create).mockResolvedValue(undefined);
  vi.mocked(adminCategoriesApi.update).mockResolvedValue(undefined);
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useCategoryForm creating", () => {
  it("sends the category, tells it and goes back to the list", async () => {
    const hook = renderCreate();
    fill(hook, complete({ parentId: "p1", sortOrder: "3", description: "Escolares" }));

    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.create).toHaveBeenCalledWith({
      name: "Cuadernos",
      description: "Escolares",
      parentId: "p1",
      sortOrder: 3,
      isActive: true,
    });
    expect(toast.success).toHaveBeenCalledWith("Categoría creada");
    expect(push).toHaveBeenCalledWith("/admin/categorias");
  });

  it("does not send anything while the form is not valid, and marks what is missing", async () => {
    const hook = renderCreate();
    fill(hook, complete({ name: "" }));

    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.create).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(hook.result.current.errors.name?.message).toBe("Escribí el nombre.");
  });

  it("makes one request when it is submitted twice at once", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminCategoriesApi.create).mockReturnValue(
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

    expect(adminCategoriesApi.create).toHaveBeenCalledTimes(1);
  });

  it("sends nothing more once it was saved, while the page is on its way out", async () => {
    const hook = renderCreate();
    fill(hook, complete());
    await act(() => hook.result.current.submit());

    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.create).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isSaving).toBe(true);
  });

  it("goes back to the list without waiting for the lists to be read again", async () => {
    const hook = renderHook(
      () => ({ ...useCategoryForm({ mode: "create" }), queryClient: useQueryClient() }),
      { wrapper: QueryProvider },
    );
    vi.spyOn(hook.result.current.queryClient, "invalidateQueries").mockReturnValue(
      new Promise(() => {}),
    );
    act(() => hook.result.current.form.reset(complete()));

    await act(() => hook.result.current.submit());

    expect(toast.success).toHaveBeenCalledWith("Categoría creada");
    expect(push).toHaveBeenCalledWith("/admin/categorias");
  });

  it("reads the lists again but only marks the category as stale, so the form keeps what it shows", async () => {
    const hook = renderHook(
      () => ({ ...useCategoryForm({ mode: "create" }), queryClient: useQueryClient() }),
      { wrapper: QueryProvider },
    );
    const { queryClient } = hook.result.current;
    queryClient.setQueryData(["admin-categories", "list", {}], "list");
    queryClient.setQueryData(["admin-categories", "options"], "options");
    queryClient.setQueryData(["admin-categories", "detail", "c1"], "detail");
    act(() => hook.result.current.form.reset(complete()));

    await act(() => hook.result.current.submit());

    const state = (key: unknown[]) => queryClient.getQueryState(key)?.isInvalidated;
    expect(state(["admin-categories", "list", {}])).toBe(true);
    expect(state(["admin-categories", "options"])).toBe(true);
    expect(state(["admin-categories", "detail", "c1"])).toBe(true);
  });

  it("puts what the server refuses next to its fields, keeps the values and stays on the form", async () => {
    vi.mocked(adminCategoriesApi.create).mockRejectedValue(
      refusal("VALIDATION_FAILED", "Revisá los datos.", 400, [
        { field: "name", messages: ["Ya hay una categoría con ese nombre."] },
        { field: "parentId", messages: ["Esa categoría no existe."] },
      ]),
    );
    const hook = renderCreate();
    fill(hook, complete({ parentId: "p1" }));

    await act(() => hook.result.current.submit());

    const { errors } = hook.result.current;
    expect(errors.name?.message).toBe("Ya hay una categoría con ese nombre.");
    expect(errors.parentId?.message).toBe("Esa categoría no existe.");
    expect(hook.result.current.general).toBeNull();
    expect(hook.result.current.form.getValues("name")).toBe("Cuadernos");
    expect(push).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "No pudimos guardar la categoría. Revisá los datos marcados.",
    );
  });

  it("maps a domain error to its field", async () => {
    vi.mocked(adminCategoriesApi.create).mockRejectedValue(
      refusal("CATEGORY_NAME_IN_USE", "Ese nombre ya lo usa otra categoría.", 409),
    );
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    expect(hook.result.current.errors.name?.message).toBe("Ese nombre ya lo usa otra categoría.");
  });

  it("shows a failure that belongs to no field above the form and in a message", async () => {
    vi.mocked(adminCategoriesApi.create).mockRejectedValue(
      refusal("INTERNAL_ERROR", "Algo salió mal.", 500),
    );
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    expect(hook.result.current.general).toBe("Algo salió mal.");
    expect(toast.error).toHaveBeenCalledWith("Algo salió mal.");
  });

  it("is clean at first, dirty once something is typed and clean again after saving", async () => {
    const hook = renderCreate();
    expect(hook.result.current.changed).toBe(false);

    act(() => hook.result.current.form.setValue("name", "Otro", { shouldDirty: true }));
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

    act(() => hook.result.current.form.setValue("name", "Otro", { shouldDirty: true }));

    expect(leave()).toBe(true);
  });

  it("can always be saved when creating", () => {
    expect(renderCreate().result.current.canSave).toBe(true);
  });
});

describe("useCategoryForm editing", () => {
  const initial = complete({ description: "Escolares", parentId: "p1", sortOrder: "2" });

  it("has nothing to save until something changes", async () => {
    const hook = renderEdit(initial);
    expect(hook.result.current.canSave).toBe(false);

    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.update).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("sends only what changed, tells it and goes back to the list", async () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("sortOrder", "5", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.update).toHaveBeenCalledWith("c1", { sortOrder: 5 });
    expect(toast.success).toHaveBeenCalledWith("Cambios guardados");
    expect(push).toHaveBeenCalledWith("/admin/categorias");
  });

  it("moves it to the root by sending a null parent", async () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("parentId", "", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.update).toHaveBeenCalledWith("c1", { parentId: null });
  });

  it("clears the description by sending an empty text", async () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("description", "", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.update).toHaveBeenCalledWith("c1", { description: "" });
  });

  it("does not send a change that makes the form invalid", async () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("name", "", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(adminCategoriesApi.update).not.toHaveBeenCalled();
    expect(hook.result.current.errors.name).toBeDefined();
  });

  it("shows the cycle the server refuses at the parent field and keeps the change", async () => {
    vi.mocked(adminCategoriesApi.update).mockRejectedValue(
      refusal("CATEGORY_CYCLE", "Una categoría no puede quedar dentro de sí misma."),
    );
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("parentId", "c9", { shouldDirty: true }));
    await act(() => hook.result.current.submit());

    expect(hook.result.current.errors.parentId?.message).toBe(
      "Una categoría no puede quedar dentro de sí misma.",
    );
    expect(hook.result.current.form.getValues("parentId")).toBe("c9");
    expect(hook.result.current.canSave).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("is not changed when a value is only worded differently", () => {
    const hook = renderEdit(initial);

    act(() => hook.result.current.form.setValue("sortOrder", "02", { shouldDirty: true }));

    expect(hook.result.current.changed).toBe(false);
  });
});
