import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/modules/core/http";

import { getCategoryTree } from "./categories-api";

vi.mock("@/modules/core/http", () => ({ apiClient: { get: vi.fn() } }));

const dto = (slug: string, children: unknown[] = []) => ({
  id: `id-${slug}`,
  name: slug.toUpperCase(),
  slug,
  description: slug === "libros" ? "Novelas y más" : null,
  children,
});

describe("getCategoryTree", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("reads the tree with revalidation and maps it in order", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([dto("libros", [dto("infantiles")]), dto("arte")]);

    const tree = await getCategoryTree();

    expect(apiClient.get).toHaveBeenCalledWith("/categories", {
      next: { revalidate: 60 },
      timeoutMs: undefined,
    });
    expect(tree).toEqual([
      {
        id: "id-libros",
        name: "LIBROS",
        slug: "libros",
        description: "Novelas y más",
        children: [
          {
            id: "id-infantiles",
            name: "INFANTILES",
            slug: "infantiles",
            description: null,
            children: [],
          },
        ],
      },
      { id: "id-arte", name: "ARTE", slug: "arte", description: null, children: [] },
    ]);
  });

  it("passes the caller's timeout to the client", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await getCategoryTree(3000);

    expect(apiClient.get).toHaveBeenCalledWith("/categories", {
      next: { revalidate: 60 },
      timeoutMs: 3000,
    });
  });
});
