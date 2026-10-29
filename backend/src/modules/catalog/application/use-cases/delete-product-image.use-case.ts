import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { ProductImagePolicy } from "../../domain/services/product-image.policy.js";
import type { DeleteProductImageCommand } from "../dto/delete-product-image.command.js";
import type { DeletedProductImageResult } from "../dto/deleted-product-image.result.js";
import { ProductImageNotFoundError } from "../errors/product-image-not-found-error.js";
import type { ProductImageUploader } from "../services/product-image-uploader.js";
import { loadEditableProduct } from "../services/product-loading.js";

/**
 * Removes an image from its product, never the last one, and numbers the others from 1 again.
 * The product and then its images stay locked, so two deletions at once never leave it
 * without images. Its files go only once committed, so a deletion that does not happen keeps
 * them; the ones the storage would not remove are given back to be reported.
 */
export class DeleteProductImageUseCase implements UseCase<
  DeleteProductImageCommand,
  DeletedProductImageResult
> {
  constructor(
    private readonly products: ProductRepository,
    private readonly images: ProductImageRepository,
    private readonly policy: ProductImagePolicy,
    private readonly uploader: ProductImageUploader,
    private readonly transaction: TransactionManager,
  ) {}

  async execute(command: DeleteProductImageCommand): Promise<DeletedProductImageResult> {
    const deleted = await this.transaction.run(async () => {
      const product = await loadEditableProduct(this.products, command.productId);
      const images = await this.images.findByProduct(product.getId());
      // Compared in lowercase, as stored: the route may name it in capitals.
      const target = images.find((image) => image.getId() === command.imageId.toLowerCase());
      if (!target) {
        throw new ProductImageNotFoundError();
      }
      this.policy.assertCanRemove(images.length);
      await this.images.delete(target.getId());
      const moved = this.policy.compact(images.filter((image) => image !== target));
      if (moved.length > 0) {
        await this.images.saveAll(moved);
      }
      return target;
    });
    const leftovers = await this.uploader.discardDeleted(deleted.originalKey, deleted.publicKey);
    return { imageId: deleted.getId(), leftovers };
  }
}
