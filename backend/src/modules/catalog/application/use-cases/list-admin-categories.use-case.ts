import type { Page } from "../../../../shared/application/pagination.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import type { ListAdminCategoriesQuery } from "../dto/list-admin-categories.query.js";
import type { CategoryQueries } from "../ports/category-queries.js";

/** A page of the categories the admin panel lists, in tree order unless sorted or filtered. */
export class ListAdminCategoriesUseCase implements UseCase<
  ListAdminCategoriesQuery,
  Page<AdminCategoryResult>
> {
  constructor(private readonly queries: CategoryQueries) {}

  execute(query: ListAdminCategoriesQuery): Promise<Page<AdminCategoryResult>> {
    return this.queries.findAdminPage(query);
  }
}
