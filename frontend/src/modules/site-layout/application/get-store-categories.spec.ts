import { beforeEach, describe, expect, it, vi } from "vitest";

import { type CategoryNode, getCategoryTree } from "@/modules/catalog";
import { ApiError } from "@/modules/core/http";

import { getStoreCategories } from "./get-store-categories";

vi.mock("@/modules/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/catalog")>()),
  getCategoryTree: vi.fn(),
}));

const node = (slug: string, children: CategoryNode[] = []): CategoryNode => ({
  id: slug,
  name: slug,
  slug,
  description: null,
  children,
});

describe("getStoreCategories", () => {
  beforeEach(() => {
    vi.mocked(getCategoryTree).mockReset();
  });

  it("returns the first-level categories without their subtrees, waiting a short time", async () => {
    vi.mocked(getCategoryTree).mockResolvedValue([
      node("libros", [node("infantiles")]),
      node("arte"),
    ]);

    await expect(getStoreCategories()).resolves.toEqual([node("libros"), node("arte")]);
    expect(getCategoryTree).toHaveBeenCalledWith(3000);
  });

  it("returns no categories when the API fails", async () => {
    vi.mocked(getCategoryTree).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin conexión." }),
    );

    await expect(getStoreCategories()).resolves.toEqual([]);
  });

  it("lets any other error through", async () => {
    const bug = new TypeError("boom");
    vi.mocked(getCategoryTree).mockRejectedValue(bug);

    await expect(getStoreCategories()).rejects.toBe(bug);
  });
});
