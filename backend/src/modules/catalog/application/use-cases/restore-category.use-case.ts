import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { CategoryNameInUseError } from "../../domain/errors/category-name-in-use-error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import type { RestoreCategoryCommand } from "../dto/restore-category.command.js";
import type { CategoryQueries } from "../ports/category-queries.js";
import { adminResultOf, isParentAvailable, loadCategory } from "../services/category-loading.js";

/**
 * Restores a deleted category with the active state it had. Not while its parent is deleted,
 * nor while another current category has taken its name. Its subcategories stay as they are:
 * each one is restored on its own.
 */
export class RestoreCategoryUseCase implements UseCase<
  RestoreCategoryCommand,
  AdminCategoryResult
> {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly queries: CategoryQueries,
    private readonly transaction: TransactionManager,
  ) {}

  async execute(command: RestoreCategoryCommand): Promise<AdminCategoryResult> {
    await this.transaction.run(async () => {
      // It locks the category and then its parent, like a move.
      await this.categories.lockHierarchy();
      const category = await loadCategory(this.categories, command.categoryId);
      // The parent stays locked, so it cannot be deleted before this one is restored.
      const parentIsAvailable =
        category.parentId === undefined ||
        (await isParentAvailable(this.categories, category.parentId));
      // Refuses a category that is not deleted; a later failure rolls the change back.
      category.restore(parentIsAvailable);
      // A creation or a restore at once with that name is stopped by the unique index, which
      // the repository reports as the same error.
      if (await this.categories.existsByName(category.name, category.getId())) {
        throw new CategoryNameInUseError();
      }
      await this.categories.save(category);
    });

    return adminResultOf(this.queries, command.categoryId);
  }
}
