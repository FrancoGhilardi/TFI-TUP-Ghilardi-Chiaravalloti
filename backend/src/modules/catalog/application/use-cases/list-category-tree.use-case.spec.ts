import { CategoryQueries } from "../ports/category-queries.js";
import type { CategoryTreeRow } from "../services/category-tree.js";
import { ListCategoryTreeUseCase } from "./list-category-tree.use-case.js";

const row = (id: string, parentId: string | null, name: string): CategoryTreeRow => ({
  id,
  parentId,
  name,
  slug: id,
  description: null,
  sortOrder: 0,
});

class FakeCategoryQueries extends CategoryQueries {
  constructor(private readonly rows: CategoryTreeRow[]) {
    super();
  }

  findVisibleRows(): Promise<CategoryTreeRow[]> {
    return Promise.resolve(this.rows);
  }
}

describe("ListCategoryTreeUseCase", () => {
  it("builds the tree from the visible categories, hiding the ones under a hidden parent", async () => {
    const useCase = new ListCategoryTreeUseCase(
      new FakeCategoryQueries([
        row("pens", "writing", "Lapiceras"),
        row("writing", null, "Escritura"),
        row("orphan", "hidden", "Huérfana"),
      ]),
    );

    await expect(useCase.execute()).resolves.toEqual([
      {
        id: "writing",
        name: "Escritura",
        slug: "writing",
        description: null,
        children: [
          { id: "pens", name: "Lapiceras", slug: "pens", description: null, children: [] },
        ],
      },
    ]);
  });
});
