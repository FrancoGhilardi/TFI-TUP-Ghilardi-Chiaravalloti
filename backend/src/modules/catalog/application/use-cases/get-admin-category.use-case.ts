import type { UseCase } from "../../../../shared/application/use-case.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import type { CategoryQueries } from "../ports/category-queries.js";
import { adminResultOf } from "../services/category-loading.js";

/** A category as the admin panel shows it, deleted or not. */
export class GetAdminCategoryUseCase implements UseCase<string, AdminCategoryResult> {
  constructor(private readonly queries: CategoryQueries) {}

  execute(categoryId: string): Promise<AdminCategoryResult> {
    return adminResultOf(this.queries, categoryId);
  }
}
