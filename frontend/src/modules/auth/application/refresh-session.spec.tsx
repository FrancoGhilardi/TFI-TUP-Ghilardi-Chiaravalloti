import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";

import { authApi, type LoginResult } from "../infrastructure/auth-api";
import { expectNoStoredSession } from "../testing/expect-no-stored-session";
import { refreshSession } from "./refresh-session";
import { useSessionStore } from "./session-store";

vi.mock("../infrastructure/auth-api", () => ({ authApi: { refresh: vi.fn() } }));

const renewed: LoginResult = {
  accessToken: "token-renewed",
  expiresIn: 900,
  user: {
    id: "u1",
    email: "marta@libreriamisueno.com.ar",
    name: "Marta",
    role: "ADMIN",
    mustChangePassword: false,
  },
};

beforeEach(() => {
  vi.mocked(authApi.refresh).mockReset();
  useSessionStore.setState({ status: "loading", accessToken: null, user: null });
});

describe("refreshSession", () => {
  it("starts the session with what the API gives back", async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(renewed);

    await expect(refreshSession()).resolves.toBe(true);

    expect(useSessionStore.getState()).toMatchObject({
      status: "authenticated",
      accessToken: "token-renewed",
      user: renewed.user,
    });
    expectNoStoredSession();
  });

  it.each([401, 403])("ends the session when the API refuses it with a %i", async (status) => {
    vi.mocked(authApi.refresh).mockRejectedValue(
      new ApiError({ status, code: "INVALID_REFRESH_TOKEN", message: "x" }),
    );

    await expect(refreshSession()).resolves.toBe(false);

    expect(useSessionStore.getState()).toMatchObject({ status: "anonymous", accessToken: null });
  });

  it.each([
    ["a network failure", 0, "NETWORK_ERROR"],
    ["a server error", 502, "INTERNAL_ERROR"],
  ])("marks a session being restored as unavailable after %s", async (_case, status, code) => {
    vi.mocked(authApi.refresh).mockRejectedValue(new ApiError({ status, code, message: "x" }));

    await expect(refreshSession()).resolves.toBe(false);

    expect(useSessionStore.getState().status).toBe("unavailable");
  });

  it("keeps a session that was already there when the API cannot be reached", async () => {
    useSessionStore.getState().start(renewed);
    vi.mocked(authApi.refresh).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "x" }),
    );

    await expect(refreshSession()).resolves.toBe(false);

    expect(useSessionStore.getState()).toMatchObject({
      status: "authenticated",
      accessToken: "token-renewed",
    });
  });

  it("does not bring back a session that was closed while the refresh was on its way", async () => {
    let finish: (result: LoginResult) => void = () => {};
    vi.mocked(authApi.refresh).mockReturnValue(
      new Promise<LoginResult>((resolve) => {
        finish = resolve;
      }),
    );
    useSessionStore.getState().start(renewed);

    const refreshing = refreshSession();
    useSessionStore.getState().signOut();
    finish(renewed);

    await expect(refreshing).resolves.toBe(false);
    expect(useSessionStore.getState()).toMatchObject({ status: "signedOut", accessToken: null });
  });

  it("does not turn a closed session into an expired one when the refresh is refused", async () => {
    let fail: (error: unknown) => void = () => {};
    vi.mocked(authApi.refresh).mockReturnValue(
      new Promise<LoginResult>((_resolve, reject) => {
        fail = reject;
      }),
    );
    useSessionStore.getState().start(renewed);

    const refreshing = refreshSession();
    useSessionStore.getState().signOut();
    fail(new ApiError({ status: 401, code: "INVALID_SESSION", message: "x" }));

    await expect(refreshing).resolves.toBe(false);
    expect(useSessionStore.getState().status).toBe("signedOut");
  });

  it("makes a single request for callers that ask at the same time", async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(renewed);

    await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(authApi.refresh).toHaveBeenCalledTimes(1);
  });

  it("asks again once the previous call is over", async () => {
    vi.mocked(authApi.refresh).mockResolvedValue(renewed);

    await refreshSession();
    await refreshSession();

    expect(authApi.refresh).toHaveBeenCalledTimes(2);
  });
});
