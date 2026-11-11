import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionUser, useUpdateSessionUser } from "@/modules/auth";
import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { EMPTY_USER_FORM, type UserFormValues } from "../domain/user-form";
import { adminUsersApi } from "../infrastructure/admin-users-client";
import { useUserForm } from "./useUserForm";

const push = vi.fn();
const updateSessionUser = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/auth")>()),
  useSessionUser: vi.fn(),
  useUpdateSessionUser: vi.fn(),
}));
vi.mock("../infrastructure/admin-users-client", () => ({
  adminUsersApi: { create: vi.fn(), update: vi.fn() },
}));

const complete = (overrides: Partial<UserFormValues> = {}): UserFormValues => ({
  ...EMPTY_USER_FORM,
  name: "Ana Pérez",
  email: "ana@libreriamisueno.com.ar",
  role: "SELLER",
  temporaryPassword: "clave-temporal-1",
  passwordConfirmation: "clave-temporal-1",
  ...overrides,
});

const refusal = (
  code: string,
  message: string,
  status = 422,
  details?: { field: string; messages: string[] }[],
) => new ApiError({ status, code, message, details });

const renderCreate = () =>
  renderHook(() => useUserForm({ mode: "create" }), { wrapper: QueryProvider });

const initial = complete({ temporaryPassword: "", passwordConfirmation: "" });

const renderEdit = (userId = "u2") =>
  renderHook(() => useUserForm({ mode: "edit", userId, initial }), { wrapper: QueryProvider });

const fill = (hook: ReturnType<typeof renderCreate>, values: UserFormValues) =>
  act(() => hook.result.current.form.reset(values));

const change = (
  hook: ReturnType<typeof renderCreate>,
  field: keyof UserFormValues,
  value: string | boolean,
) => act(() => hook.result.current.form.setValue(field, value as never, { shouldDirty: true }));

beforeEach(() => {
  push.mockReset();
  updateSessionUser.mockReset();
  vi.mocked(useSessionUser).mockReturnValue({
    id: "u1",
    email: "marta@libreriamisueno.com.ar",
    name: "Marta",
    role: "ADMIN",
    mustChangePassword: false,
  });
  vi.mocked(useUpdateSessionUser).mockReturnValue(updateSessionUser);
  vi.mocked(adminUsersApi.create).mockReset();
  vi.mocked(adminUsersApi.update).mockReset();
  vi.mocked(adminUsersApi.create).mockResolvedValue(undefined);
  vi.mocked(adminUsersApi.update).mockResolvedValue(undefined);
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useUserForm creating", () => {
  it("sends the user without the confirmation, tells it and goes back to the list", async () => {
    const hook = renderCreate();
    fill(hook, complete({ role: "ADMIN" }));

    await act(() => hook.result.current.submit());

    expect(adminUsersApi.create).toHaveBeenCalledWith({
      name: "Ana Pérez",
      email: "ana@libreriamisueno.com.ar",
      role: "ADMIN",
      temporaryPassword: "clave-temporal-1",
    });
    expect(toast.success).toHaveBeenCalledWith("Usuario creado");
    expect(push).toHaveBeenCalledWith("/admin/usuarios");
    expect(updateSessionUser).not.toHaveBeenCalled();
  });

  it("sends nothing while the form is not valid, and marks what is wrong", async () => {
    const hook = renderCreate();
    fill(hook, complete({ passwordConfirmation: "otra-clave-9" }));

    await act(() => hook.result.current.submit());

    expect(adminUsersApi.create).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(hook.result.current.errors.passwordConfirmation?.message).toBe(
      "Las contraseñas no coinciden.",
    );
  });

  it("makes one request when it is submitted twice at once", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminUsersApi.create).mockReturnValue(
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

    expect(adminUsersApi.create).toHaveBeenCalledTimes(1);
  });

  it("sends nothing more once it was saved, while the page is on its way out", async () => {
    const hook = renderCreate();
    fill(hook, complete());
    await act(() => hook.result.current.submit());

    await act(() => hook.result.current.submit());

    expect(adminUsersApi.create).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isSaving).toBe(true);
  });

  it("reads the lists again but only marks the user as stale, so the form keeps what it shows", async () => {
    const hook = renderHook(
      () => ({ ...useUserForm({ mode: "create" }), queryClient: useQueryClient() }),
      { wrapper: QueryProvider },
    );
    const { queryClient } = hook.result.current;
    queryClient.setQueryData(["admin-users", "list", {}], "list");
    queryClient.setQueryData(["admin-users", "total"], "total");
    queryClient.setQueryData(["admin-users", "detail", "u1"], "detail");
    act(() => hook.result.current.form.reset(complete()));

    await act(() => hook.result.current.submit());

    const state = (key: unknown[]) => queryClient.getQueryState(key)?.isInvalidated;
    expect(state(["admin-users", "list", {}])).toBe(true);
    expect(state(["admin-users", "total"])).toBe(true);
    expect(state(["admin-users", "detail", "u1"])).toBe(true);
  });

  it("puts what the server refuses next to its fields, keeps the values and stays on the form", async () => {
    vi.mocked(adminUsersApi.create).mockRejectedValue(
      refusal("VALIDATION_FAILED", "Revisá los datos.", 400, [
        { field: "email", messages: ["Ese email no es válido."] },
        { field: "temporaryPassword", messages: ["Es muy corta."] },
      ]),
    );
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    const { errors } = hook.result.current;
    expect(errors.email?.message).toBe("Ese email no es válido.");
    expect(errors.temporaryPassword?.message).toBe("Es muy corta.");
    expect(hook.result.current.general).toBeNull();
    expect(hook.result.current.form.getValues("name")).toBe("Ana Pérez");
    expect(push).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "No pudimos guardar el usuario. Revisá los datos marcados.",
    );
  });

  it("puts an email that is already in use at the email field", async () => {
    vi.mocked(adminUsersApi.create).mockRejectedValue(
      refusal("EMAIL_ALREADY_IN_USE", "Ese email ya lo usa otro usuario.", 409),
    );
    const hook = renderCreate();
    fill(hook, complete());

    await act(() => hook.result.current.submit());

    expect(hook.result.current.errors.email?.message).toBe("Ese email ya lo usa otro usuario.");
  });

  it("shows a failure that belongs to no field above the form and in a message", async () => {
    vi.mocked(adminUsersApi.create).mockRejectedValue(
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

    change(hook, "name", "Otro");
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

    change(hook, "name", "Otro");

    expect(leave()).toBe(true);
  });
});

describe("useUserForm editing", () => {
  it("has nothing to save until something changes", async () => {
    const hook = renderEdit();
    expect(hook.result.current.canSave).toBe(false);

    await act(() => hook.result.current.submit());

    expect(adminUsersApi.update).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("sends only what changed, tells it and goes back to the list", async () => {
    const hook = renderEdit();

    change(hook, "role", "ADMIN");
    await act(() => hook.result.current.submit());

    expect(adminUsersApi.update).toHaveBeenCalledWith("u2", { role: "ADMIN" });
    expect(toast.success).toHaveBeenCalledWith("Cambios guardados");
    expect(push).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("does not look at the password fields", async () => {
    const hook = renderEdit();

    change(hook, "name", "Ana P.");
    await act(() => hook.result.current.submit());

    expect(adminUsersApi.update).toHaveBeenCalledWith("u2", { name: "Ana P." });
  });

  it("does not send a change that makes the form invalid", async () => {
    const hook = renderEdit();

    change(hook, "email", "sin-arroba");
    await act(() => hook.result.current.submit());

    expect(adminUsersApi.update).not.toHaveBeenCalled();
    expect(hook.result.current.errors.email).toBeDefined();
  });

  it("is not changed when a value is only worded differently", () => {
    const hook = renderEdit();

    change(hook, "email", "ANA@libreriamisueno.com.ar ");

    expect(hook.result.current.changed).toBe(false);
  });

  it("shows the refusal to change the role at the role field and keeps the change", async () => {
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      refusal("LAST_ACTIVE_ADMIN", "Tiene que quedar al menos un administrador activo."),
    );
    const hook = renderEdit();

    change(hook, "role", "ADMIN");
    await act(() => hook.result.current.submit());

    expect(hook.result.current.errors.role?.message).toBe(
      "Tiene que quedar al menos un administrador activo.",
    );
    expect(hook.result.current.form.getValues("role")).toBe("ADMIN");
    expect(hook.result.current.canSave).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the refusal to deactivate at the state field", async () => {
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      refusal("SELF_ADMINISTRATION", "No podés desactivarte a vos mismo."),
    );
    const hook = renderEdit();

    change(hook, "isActive", false);
    await act(() => hook.result.current.submit());

    expect(hook.result.current.errors.isActive?.message).toBe("No podés desactivarte a vos mismo.");
  });

  it("does not touch the session when another user is edited", async () => {
    const hook = renderEdit("u2");

    change(hook, "name", "Ana P.");
    await act(() => hook.result.current.submit());

    expect(updateSessionUser).not.toHaveBeenCalled();
  });

  it("updates the session's user when the signed-in user edits their own name and email", async () => {
    const hook = renderEdit("u1");

    change(hook, "name", "Marta Gómez");
    change(hook, "email", "Marta.G@libreriamisueno.com.ar");
    await act(() => hook.result.current.submit());

    expect(updateSessionUser).toHaveBeenCalledWith({
      name: "Marta Gómez",
      email: "marta.g@libreriamisueno.com.ar",
    });
  });

  it("does not update the session when saving one's own account was refused", async () => {
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      refusal("EMAIL_ALREADY_IN_USE", "En uso.", 409),
    );
    const hook = renderEdit("u1");

    change(hook, "email", "otro@libreriamisueno.com.ar");
    await act(() => hook.result.current.submit());

    expect(updateSessionUser).not.toHaveBeenCalled();
  });
});
