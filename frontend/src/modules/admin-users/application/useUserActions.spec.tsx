import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";
import { toast } from "@/modules/core/ui/toast";

import { adminUsersApi } from "../infrastructure/admin-users-client";
import { useUserActions } from "./useUserActions";

vi.mock("../infrastructure/admin-users-client", () => ({
  adminUsersApi: { remove: vi.fn(), restore: vi.fn(), resetPassword: vi.fn() },
}));
vi.mock("@/modules/core/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderActions = () =>
  renderHook(() => ({ ...useUserActions(), queryClient: useQueryClient() }), {
    wrapper: QueryProvider,
  });

beforeEach(() => {
  for (const call of Object.values(adminUsersApi)) {
    vi.mocked(call as () => Promise<void>).mockReset();
  }
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("useUserActions", () => {
  it("deletes, tells it and reads the users again", async () => {
    vi.mocked(adminUsersApi.remove).mockResolvedValue(undefined);
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current.remove("u1"));

    expect(adminUsersApi.remove).toHaveBeenCalledWith("u1");
    expect(toast.success).toHaveBeenCalledWith("Usuario dado de baja");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-users"] });
  });

  it("restores and tells it", async () => {
    vi.mocked(adminUsersApi.restore).mockResolvedValue(undefined);
    const { result } = renderActions();

    await act(() => result.current.restore("u1"));

    expect(adminUsersApi.restore).toHaveBeenCalledWith("u1");
    expect(toast.success).toHaveBeenCalledWith("Usuario reactivado");
  });

  it("sends a temporary password, tells it and reads the users again", async () => {
    vi.mocked(adminUsersApi.resetPassword).mockResolvedValue(undefined);
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current.resetPassword("u1"));

    expect(adminUsersApi.resetPassword).toHaveBeenCalledWith("u1");
    expect(toast.success).toHaveBeenCalledWith("Le enviamos una contraseña temporal por mail");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-users"] });
  });

  it.each([
    ["remove", "SELF_ADMINISTRATION", "No podés darte de baja a vos mismo."],
    ["remove", "LAST_ACTIVE_ADMIN", "Tiene que quedar al menos un administrador activo."],
    ["restore", "EMAIL_ALREADY_IN_USE", "Ese email ya lo usa otro usuario."],
    ["resetPassword", "MAIL_DELIVERY_FAILED", "No pudimos enviar el mail. Probá de nuevo."],
  ] as const)("gives the API's reason when %s is refused (%s)", async (action, code, message) => {
    vi.mocked(adminUsersApi[action]).mockRejectedValue(
      new ApiError({ status: 422, code, message }),
    );
    const { result } = renderActions();
    const invalidate = vi.spyOn(result.current.queryClient, "invalidateQueries");

    await act(() => result.current[action]("u1"));

    expect(toast.error).toHaveBeenCalledWith(message);
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin-users"] });
  });

  it("says something generic when the failure is not the API's", async () => {
    vi.mocked(adminUsersApi.remove).mockRejectedValue(new TypeError("boom"));
    const { result } = renderActions();

    await act(() => result.current.remove("u1"));

    expect(toast.error).toHaveBeenCalledWith("No pudimos completar la acción. Probá de nuevo.");
  });

  it("marks the user as pending while its request is on its way, and only that one", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminUsersApi.resetPassword).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.resetPassword("u1");
    });

    await waitFor(() => expect(result.current.isPending("u1")).toBe(true));
    expect(result.current.isPending("u2")).toBe(false);
    await act(async () => finish());
    expect(result.current.isPending("u1")).toBe(false);
  });

  it("makes one request when the same user is asked twice at once, whatever the action", async () => {
    let finish: () => void = () => {};
    vi.mocked(adminUsersApi.remove).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderActions();

    act(() => {
      void result.current.remove("u1");
      void result.current.remove("u1");
      void result.current.resetPassword("u1");
    });
    await act(async () => finish());

    expect(adminUsersApi.remove).toHaveBeenCalledTimes(1);
    expect(adminUsersApi.resetPassword).not.toHaveBeenCalled();
  });

  it("lets two different users be handled at the same time", async () => {
    vi.mocked(adminUsersApi.remove).mockResolvedValue(undefined);
    const { result } = renderActions();

    await act(async () => {
      await Promise.all([result.current.remove("u1"), result.current.remove("u2")]);
    });

    expect(adminUsersApi.remove).toHaveBeenCalledTimes(2);
  });
});
