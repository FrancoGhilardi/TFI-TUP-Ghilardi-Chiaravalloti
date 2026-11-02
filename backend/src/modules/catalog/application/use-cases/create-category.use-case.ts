import type { Clock } from "../../../../shared/application/clock.js";
import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UniqueSlugGenerator } from "../../../../shared/application/unique-slug-generator.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { Category } from "../../domain/entities/category.js";
import { CategoryNameInUseError } from "../../domain/errors/category-name-in-use-error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import type { CreateCategoryCommand } from "../dto/create-category.command.js";
import type { CategoryQueries } from "../ports/category-queries.js";
import { adminResultOf, assertParentAvailable } from "../services/category-loading.js";

/**
 * A category is created at the root or under a parent that exists and is not deleted, active
 * or not, so a hidden branch can be built before showing it. Its name is unique among the
 * current categories and its slug, generated from the name, among all of them.
 */
export class CreateCategoryUseCase implements UseCase<CreateCategoryCommand, AdminCategoryResult> {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly slugs: UniqueSlugGenerator,
    private readonly ids: IdGenerator,
    private readonly queries: CategoryQueries,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<AdminCategoryResult> {
    // Checked before the transaction, so a blank name never opens one.
    const name = Category.validName(command.name);
    const id = this.ids.next();

    await this.transaction.run(async () => {
      // The parent stays locked, so it cannot be deleted before this one is saved under it.
      if (command.parentId !== undefined) {
        await assertParentAvailable(this.categories, command.parentId);
      }
      // Two creations at once with the same name are stopped by the unique index instead,
      // which the repository reports as the same error.
      if (await this.categories.existsByName(name)) {
        throw new CategoryNameInUseError();
      }
      const category = Category.create({
        id,
        parentId: command.parentId,
        name,
        slug: await this.slugs.generate(name, (slug) => this.categories.existsBySlug(slug)),
        description: command.description,
        sortOrder: command.sortOrder,
        now: this.clock.now(),
      });
      if (command.isActive === false) {
        category.deactivate();
      }
      await this.categories.save(category);
    });

    return adminResultOf(this.queries, id);
  }
}
