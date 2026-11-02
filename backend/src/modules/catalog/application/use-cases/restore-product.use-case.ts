import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import type { RestoreProductCommand } from "../dto/restore-product.command.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { detailOf, loadProduct } from "../services/product-loading.js";

/**
 * Restores a deleted product with the active state, slug and SKU it had, as long as one of its
 * categories is still current. Its categories stay as they were, deleted ones included.
 */
export class RestoreProductUseCase implements UseCase<
  RestoreProductCommand,
  AdminProductDetailResult
> {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly transaction: TransactionManager,
    private readonly queries: AdminProductQueries,
  ) {}

  async execute(command: RestoreProductCommand): Promise<AdminProductDetailResult> {
    await this.transaction.run(async () => {
      const product = await loadProduct(this.products, command.productId);
      // The current ones stay share-locked: deleting one of them waits, and then counts this
      // product as current, so it is never left without a current category.
      const hasCurrentCategory =
        product.isDeleted() &&
        (
          await this.categories.findCurrentIds(
            product.categories.map((assignment) => assignment.categoryId),
          )
        ).length > 0;
      // Refuses a product that is not deleted before anything else.
      product.restore(command.actorId, hasCurrentCategory);
      await this.products.save(product);
    });

    return detailOf(this.queries, command.productId);
  }
}
