import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { EMPTY_USERS_QUERY } from "../domain/users-query";
import { adminUsersApi } from "../infrastructure/admin-users-client";
import { useAdminUsers } from "./useAdminUsers";

vi.mock("../infrastructure/admin-users-client", () => ({
  adminUsersApi: { list: vi.fn() },
}));

const page = (name: string) => ({ total: 1, items: [{ id: name, name }] as never });

beforeEach(() => {
  vi.mocked(adminUsersApi.list).mockReset();
});

describe("useAdminUsers", () => {
  it("asks the API for what the query says", async () => {
    vi.mocked(adminUsersApi.list).mockResolvedValue(page("uno"));
    const query = {
      ...EMPTY_USERS_QUERY,
      q: "marta",
      role: "admin" as const,
      state: "bajas" as const,
    };

    const { result } = renderHook(() => useAdminUsers(query), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: "marta", role: "ADMIN", status: "DELETED", page: 1, limit: 20 }),
      expect.any(AbortSignal),
    );
  });

  it("keeps showing the last page while the next one loads", async () => {
    vi.mocked(adminUsersApi.list).mockResolvedValueOnce(page("primera"));
    let finish: (value: ReturnType<typeof page>) => void = () => {};
    vi.mocked(adminUsersApi.list).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ pageNumber }) => useAdminUsers({ ...EMPTY_USERS_QUERY, page: pageNumber }),
      { wrapper: QueryProvider, initialProps: { pageNumber: 1 } },
    );
    await waitFor(() => expect(result.current.data?.items[0]).toMatchObject({ name: "primera" }));

    rerender({ pageNumber: 2 });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.items[0]).toMatchObject({ name: "primera" });
    finish(page("segunda"));
    await waitFor(() => expect(result.current.data?.items[0]).toMatchObject({ name: "segunda" }));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("tells when it could not be read", async () => {
    vi.mocked(adminUsersApi.list).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useAdminUsers(EMPTY_USERS_QUERY), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
