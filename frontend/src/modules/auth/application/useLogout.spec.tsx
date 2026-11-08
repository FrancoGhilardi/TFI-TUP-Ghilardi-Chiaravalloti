import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { authApi } from "../infrastructure/auth-api";
import { expectNoStoredSession } from "../testing/expect-no-stored-session";
import { useLogout } from "./useLogout";
import { useSessionStore } from "./session-store";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../infrastructure/auth-api", () => ({ authApi: { logout: vi.fn() } }));

const renderLogout = () =>
  renderHook(() => ({ ...useLogout(), queryClient: useQueryClient() }), {
    wrapper: QueryProvider,
  });

beforeEach(() => {
  replace.mockReset();
  vi.mocked(authApi.logout).mockReset();
  localStorage.clear();
  sessionStorage.clear();
  useSessionStore.getState().start({
    accessToken: "token-123",
    expiresIn: 900,
    user: {
      id: "u1",
      email: "marta@libreriamisueno.com.ar",
      name: "Marta",
      role: "ADMIN",
      mustChangePassword: false,
    },
  });
});

describe("useLogout", () => {
  it("tells the API, clears the session and goes to sign in", async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    const { result } = renderLogout();

    act(() => result.current.logout());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState()).toMatchObject({
      status: "signedOut",
      accessToken: null,
      user: null,
    });
    expectNoStoredSession();
  });

  it.each([
    ["a connection failure", new ApiError({ status: 0, code: "NETWORK_ERROR", message: "x" })],
    ["a server error", new ApiError({ status: 500, code: "INTERNAL_ERROR", message: "x" })],
    [
      "a session the API no longer knows",
      new ApiError({ status: 401, code: "INVALID_SESSION", message: "x" }),
    ],
    ["a refused origin", new ApiError({ status: 403, code: "ORIGIN_NOT_ALLOWED", message: "x" })],
  ])("still ends the session after %s", async (_case, error) => {
    vi.mocked(authApi.logout).mockRejectedValue(error);
    const { result } = renderLogout();

    act(() => result.current.logout());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
    expect(useSessionStore.getState()).toMatchObject({ status: "signedOut", accessToken: null });
  });

  it("ends the session before the API answers, so the token cannot be used meanwhile", async () => {
    let finish: () => void = () => {};
    vi.mocked(authApi.logout).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderLogout();

    act(() => result.current.logout());

    await waitFor(() => expect(useSessionStore.getState().status).toBe("signedOut"));
    expect(useSessionStore.getState().accessToken).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    act(finish);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login"));
  });

  it("stops what is still on its way before the session is closed", async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    const { result } = renderLogout();
    const cancel = vi.spyOn(result.current.queryClient, "cancelQueries");

    act(() => result.current.logout());

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("leaves nothing that was fetched for the person in memory", async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    const { result } = renderLogout();
    result.current.queryClient.setQueryData(["products"], [{ id: 1 }]);
    expect(result.current.queryClient.getQueryCache().getAll()).toHaveLength(1);

    act(() => result.current.logout());

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(result.current.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("makes a single request when it is asked twice", async () => {
    let finish: () => void = () => {};
    vi.mocked(authApi.logout).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderLogout();

    act(() => {
      result.current.logout();
      result.current.logout();
    });
    await waitFor(() => expect(result.current.isBusy).toBe(true));
    act(() => result.current.logout());
    act(finish);

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(authApi.logout).toHaveBeenCalledTimes(1);
  });
});
