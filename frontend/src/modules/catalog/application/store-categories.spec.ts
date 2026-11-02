import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";

import type { CategoryNode } from "../domain/category";
import { getCategoryTree } from "../infrastructure/categories-api";
import { getStoreCategoryTree, getStoreRootCategories } from "./store-categories";

vi.mock("../infrastructure/categories-api", () => ({ getCategoryTree: vi.fn() }));

const node = (slug: string, children: CategoryNode[] = []): CategoryNode => ({
  id: slug,
  name: slug,
  slug,
  description: null,
  children,
});

describe("getStoreCategoryTree", () => {
  beforeEach(() => {
    vi.mocked(getCategoryTree).mockReset();
  });

  it("returns the whole tree, waiting a short time", async () => {
    const tree = [node("libros", [node("infantiles")])];
    vi.mocked(getCategoryTree).mockResolvedValue(tree);

    await expect(getStoreCategoryTree()).resolves.toEqual(tree);
    expect(getCategoryTree).toHaveBeenCalledWith(3000);
  });
});

describe("getStoreRootCategories", () => {
  beforeEach(() => {
    vi.mocked(getCategoryTree).mockReset();
  });

  it("returns the first-level categories without their subtrees, waiting a short time", async () => {
    vi.mocked(getCategoryTree).mockResolvedValue([
      node("libros", [node("infantiles")]),
      node("arte"),
    ]);

    await expect(getStoreRootCategories()).resolves.toEqual([node("libros"), node("arte")]);
    expect(getCategoryTree).toHaveBeenCalledWith(3000);
  });

  it("returns no categories when the API fails", async () => {
    vi.mocked(getCategoryTree).mockRejectedValue(
      new ApiError({ status: 0, code: "NETWORK_ERROR", message: "Sin conexión." }),
    );

    await expect(getStoreRootCategories()).resolves.toEqual([]);
  });

  it("lets any other error through", async () => {
    const bug = new TypeError("boom");
    vi.mocked(getCategoryTree).mockRejectedValue(bug);

    await expect(getStoreRootCategories()).rejects.toBe(bug);
  });
});
