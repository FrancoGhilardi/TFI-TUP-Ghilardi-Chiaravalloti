import type { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import type { Clock } from "../../../../shared/application/clock.js";
import type { EventPublisher } from "../../../../shared/application/event-publisher.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import type { RetryProductImageProcessingCommand } from "../dto/retry-product-image-processing.command.js";
import { ProductImageUploadedEvent } from "../events/product-image-uploaded.event.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { imageResultOf, loadProductImage } from "../services/image-loading.js";
import { loadEditableProduct } from "../services/product-loading.js";

/**
 * Sends a failed image back to wait for processing and asks for it again once committed,
 * without uploading the file anew.
 */
export class RetryProductImageProcessingUseCase implements UseCase<
  RetryProductImageProcessingCommand,
  AdminProductImageResult
> {
  constructor(
    private readonly products: ProductRepository,
    private readonly images: ProductImageRepository,
    private readonly transaction: TransactionManager,
    private readonly events: EventPublisher,
    private readonly background: BackgroundTasks,
    private readonly queries: AdminProductQueries,
    private readonly clock: Clock,
  ) {}

  async execute(command: RetryProductImageProcessingCommand): Promise<AdminProductImageResult> {
    // The stored id, in the case it is kept: the route may name it in capitals.
    const imageId = await this.transaction.run(async () => {
      const product = await loadEditableProduct(this.products, command.productId);
      const image = await loadProductImage(this.images, product.getId(), command.imageId);
      image.retryProcessing(this.clock.now());
      await this.images.saveAll([image]);
      return image.getId();
    });
    // A failure is only reported: the image waits as pending, as after an upload.
    this.background.run("Publishing a product image to process again", () =>
      this.events.publish(new ProductImageUploadedEvent(imageId)),
    );
    return imageResultOf(this.queries, imageId);
  }
}
