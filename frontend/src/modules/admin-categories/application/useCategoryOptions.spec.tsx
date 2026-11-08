import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@/modules/core/providers/QueryProvider";

import { adminCategoriesApi } from "../infrastructure/admin-categories-client";
import { useCategoryOptions } from "./useCategoryOptions";

vi.mock("../infrastructure/admin-categories-client", () => ({
  adminCategoriesApi: { listAll: vi.fn() },
}));

describe("useCategoryOptions", () => {
  it("gives the categories to pick from", async () => {
    vi.mocked(adminCategoriesApi.listAll).mockResolvedValue([
      { id: "c1", label: "Libros", isActive: true },
    ]);

    const { result } = renderHook(() => useCategoryOptions(), { wrapper: QueryProvider });

    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "c1", label: "Libros", isActive: true }]),
    );
  });

  it("tells when they could not be read", async () => {
    vi.mocked(adminCategoriesApi.listAll).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useCategoryOptions(), { wrapper: QueryProvider });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
