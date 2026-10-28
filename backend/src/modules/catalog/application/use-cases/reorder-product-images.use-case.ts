import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { ProductImagePolicy } from "../../domain/services/product-image.policy.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import type { ReorderProductImagesCommand } from "../dto/reorder-product-images.command.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { loadEditableProduct } from "../services/product-loading.js";

/**
 * Puts a product's images in the order given, from position 1 with no gaps. The product and
 * then its images stay locked, as the upload locks them, so the set checked is the set saved.
 */
export class ReorderProductImagesUseCase implements UseCase<
  ReorderProductImagesCommand,
  AdminProductImageResult[]
> {
  constructor(
    private readonly products: ProductRepository,
    private readonly images: ProductImageRepository,
    private readonly policy: ProductImagePolicy,
    private readonly transaction: TransactionManager,
    private readonly queries: AdminProductQueries,
  ) {}

  async execute(command: ReorderProductImagesCommand): Promise<AdminProductImageResult[]> {
    const productId = await this.transaction.run(async () => {
      const product = await loadEditableProduct(this.products, command.productId);
      const images = await this.images.findByProduct(product.getId());
      // The same order changes nothing.
      if (this.policy.reorder(images, command.imageIds)) {
        await this.images.saveAll(images);
      }
      return product.getId();
    });
    return this.queries.findImagesByProduct(productId);
  }
}
