import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { Category } from "../../domain/entities/category.js";
import { CategoryDeletedError } from "../../domain/errors/category-deleted-error.js";
import { CategoryNameInUseError } from "../../domain/errors/category-name-in-use-error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import type { UpdateCategoryCommand } from "../dto/update-category.command.js";
import type { CategoryQueries } from "../ports/category-queries.js";
import {
  adminResultOf,
  assertParentAvailable,
  loadCategory,
} from "../services/category-loading.js";

/**
 * Edits the name, description, parent, position or status of a category; the slug never
 * changes. A deleted category can only be restored, and an edit that leaves everything as it
 * was saves nothing. Deactivating a category hides its whole branch from the store.
 */
export class UpdateCategoryUseCase implements UseCase<UpdateCategoryCommand, AdminCategoryResult> {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly queries: CategoryQueries,
    private readonly transaction: TransactionManager,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<AdminCategoryResult> {
    // Checked before the transaction, so a blank name never opens one.
    const name = command.name === undefined ? undefined : Category.validName(command.name);
    const newParentId = command.parentId ?? undefined;

    await this.transaction.run(async () => {
      if (newParentId !== undefined) {
        await this.categories.lockHierarchy();
      }
      const category = await loadCategory(this.categories, command.categoryId);
      if (category.isDeleted()) {
        throw new CategoryDeletedError();
      }
      const before = snapshot(category);

      if (name !== undefined && name !== category.name) {
        // Two edits at once to the same name are stopped by the unique index instead.
        if (await this.categories.existsByName(name, category.getId())) {
          throw new CategoryNameInUseError();
        }
        category.rename(name);
      }
      if (command.description !== undefined) {
        category.describe(command.description);
      }
      if (command.parentId === null) {
        category.moveToRoot();
      } else if (newParentId !== undefined && newParentId !== category.parentId) {
        await this.moveUnder(category, newParentId);
      }
      if (command.sortOrder !== undefined) {
        category.changeSortOrder(command.sortOrder);
      }
      if (command.isActive === true) {
        category.activate();
      } else if (command.isActive === false) {
        category.deactivate();
      }

      // Saving an untouched category would still stamp updated_at in the database.
      if (snapshot(category) !== before) {
        await this.categories.save(category);
      }
    });

    return adminResultOf(this.queries, command.categoryId);
  }

  /**
   * The ancestors are read once the hierarchy is locked, so no other move can change them
   * before this one is saved.
   */
  private async moveUnder(category: Category, parentId: string): Promise<void> {
    // Under itself is a loop, not a missing parent.
    if (parentId !== category.getId()) {
      await assertParentAvailable(this.categories, parentId);
    }
    category.moveTo(parentId, await this.categories.findAncestorIds(parentId));
  }
}

/** What an edit can change, to tell whether it changed anything. */
function snapshot(category: Category): string {
  return JSON.stringify([
    category.name,
    category.description ?? null,
    category.parentId ?? null,
    category.sortOrder,
    category.active,
  ]);
}
