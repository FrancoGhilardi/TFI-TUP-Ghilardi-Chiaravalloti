import { Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { categories } from "../../../../shared/infrastructure/database/schema/index.js";
import { CategoryQueries } from "../../application/ports/category-queries.js";
import type { CategoryTreeRow } from "../../application/services/category-tree.js";

@Injectable()
export class DrizzleCategoryQueries extends CategoryQueries {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  findVisibleRows(): Promise<CategoryTreeRow[]> {
    return this.executor
      .current()
      .select({
        id: categories.id,
        parentId: categories.parentId,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(and(eq(categories.isActive, true), isNull(categories.deletedAt)));
  }
}
