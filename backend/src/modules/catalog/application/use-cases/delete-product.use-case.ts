import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { DeleteProductCommand } from "../dto/delete-product.command.js";
import { loadProduct } from "../services/product-loading.js";

/**
 * Deletes a product, logically: its images, files and related products stay as they are, so
 * a restore brings it back whole. Deleting a deleted product changes nothing.
 */
export class DeleteProductUseCase implements UseCase<DeleteProductCommand, void> {
  constructor(
    private readonly products: ProductRepository,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: DeleteProductCommand): Promise<void> {
    await this.transaction.run(async () => {
      const product = await loadProduct(this.products, command.productId);
      // Already deleted: the first deletion keeps its date and author, and nothing is written,
      // since saving would still stamp updated_at in the database.
      if (product.isDeleted()) {
        return;
      }
      product.softDelete(command.actorId, this.clock.now());
      await this.products.save(product);
    });
  }
}
