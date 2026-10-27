import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryDeletionPolicy } from "../../domain/services/category-deletion.policy.js";
import type { DeleteCategoryCommand } from "../dto/delete-category.command.js";
import { loadCategory } from "../services/category-loading.js";

/**
 * Deletes a category, logically, as long as no current subcategory hangs from it and no
 * current product has it as its only category. Deleting a deleted category changes nothing.
 */
export class DeleteCategoryUseCase implements UseCase<DeleteCategoryCommand, void> {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly policy: CategoryDeletionPolicy,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    await this.transaction.run(async () => {
      // Two deletions at once would each see the other category of a product as current and
      // leave it with none, so deletions run one at a time.
      await this.categories.lockHierarchy();
      // Creating, moving or restoring a subcategory locks this one as its parent, so none can
      // appear between the count and the deletion.
      const category = await loadCategory(this.categories, command.categoryId);
      // Already deleted: the first deletion keeps its date, and nothing is written, since
      // saving would still stamp updated_at in the database.
      if (category.isDeleted()) {
        return;
      }
      const id = category.getId();
      this.policy.assertCanDelete(
        await this.categories.countCurrentChildren(id),
        await this.categories.countProductsWhereOnlyCategory(id),
      );
      category.softDelete(this.clock.now());
      await this.categories.save(category);
    });
  }
}
