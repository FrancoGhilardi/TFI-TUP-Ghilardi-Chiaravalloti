import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import type { UpdateProductImageCommand } from "../dto/update-product-image.command.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { imageResultOf, loadProductImage } from "../services/image-loading.js";
import { loadEditableProduct } from "../services/product-loading.js";

/** Changes the alt text of an image; the same text changes nothing. */
export class UpdateProductImageUseCase implements UseCase<
  UpdateProductImageCommand,
  AdminProductImageResult
> {
  constructor(
    private readonly products: ProductRepository,
    private readonly images: ProductImageRepository,
    private readonly transaction: TransactionManager,
    private readonly queries: AdminProductQueries,
  ) {}

  async execute(command: UpdateProductImageCommand): Promise<AdminProductImageResult> {
    const imageId = await this.transaction.run(async () => {
      const product = await loadEditableProduct(this.products, command.productId);
      const image = await loadProductImage(this.images, product.getId(), command.imageId);
      if (image.changeAltText(command.altText)) {
        await this.images.saveAll([image]);
      }
      return image.getId();
    });
    return imageResultOf(this.queries, imageId);
  }
}
