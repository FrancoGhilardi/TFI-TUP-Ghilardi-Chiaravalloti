import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";
import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { adminUsersApi } from "../infrastructure/admin-users-client";
import { useUser } from "./useUser";

vi.mock("../infrastructure/admin-users-client", () => ({
  adminUsersApi: { get: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(adminUsersApi.get).mockReset();
});

describe("useUser", () => {
  it("reads the user asked for", async () => {
    vi.mocked(adminUsersApi.get).mockResolvedValue({ id: "u1", name: "Marta" } as never);

    const { result } = renderHook(() => useUser("u1"), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.data).toMatchObject({ id: "u1" }));
    expect(adminUsersApi.get).toHaveBeenCalledWith("u1", expect.any(AbortSignal));
  });

  it("reads again when it is opened a second time, never showing a copy from before", async () => {
    vi.mocked(adminUsersApi.get).mockResolvedValue({ id: "u1", name: "Marta" } as never);
    const first = renderHook(() => useUser("u1"), { wrapper: QueryProvider });
    await waitFor(() => expect(first.result.current.data).toBeDefined());
    first.unmount();

    const second = renderHook(() => useUser("u1"), { wrapper: QueryProvider });

    expect(second.result.current.isPending).toBe(true);
    await waitFor(() => expect(second.result.current.data).toBeDefined());
    expect(adminUsersApi.get).toHaveBeenCalledTimes(2);
  });

  it("keeps the API's error, so the screen can tell a missing user from a failure", async () => {
    vi.mocked(adminUsersApi.get).mockRejectedValue(
      new ApiError({ status: 404, code: "USER_NOT_FOUND", message: "No existe." }),
    );

    const { result } = renderHook(() => useUser("u1"), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404, code: "USER_NOT_FOUND" });
  });
});
