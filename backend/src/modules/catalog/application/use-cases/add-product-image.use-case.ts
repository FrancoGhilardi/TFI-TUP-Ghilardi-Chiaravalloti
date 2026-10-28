import type { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import type { Clock } from "../../../../shared/application/clock.js";
import type { EventPublisher } from "../../../../shared/application/event-publisher.js";
import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { ProductImage, type ProductImageMimeType } from "../../domain/entities/product-image.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { ProductDeletedError } from "../../domain/errors/product-deleted-error.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { ProductImagePolicy } from "../../domain/services/product-image.policy.js";
import type { AddProductImageCommand } from "../dto/add-product-image.command.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import { ProductImageUploadedEvent } from "../events/product-image-uploaded.event.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { checkedImageType } from "../services/image-type.js";
import type { ImageKeyFactory } from "../services/image-key-factory.js";
import { loadProduct } from "../services/product-loading.js";
import type { ProductImageUploader } from "../services/product-image-uploader.js";
import type { ImageSettings } from "../settings/image-settings.js";

export interface AddProductImageDependencies {
  products: ProductRepository;
  images: ProductImageRepository;
  policy: ProductImagePolicy;
  uploader: ProductImageUploader;
  keys: ImageKeyFactory;
  ids: IdGenerator;
  settings: ImageSettings;
  transaction: TransactionManager;
  events: EventPublisher;
  background: BackgroundTasks;
  queries: AdminProductQueries;
  clock: Clock;
}

/**
 * Adds one image to a product that is not deleted, up to 5. Everything is checked before the
 * original is uploaded, out of the transaction; inside it the product stays locked while the
 * images are counted again, so two uploads at once never pass the limit. If anything fails
 * after the upload, the file is removed. The image waits to be processed: its event is
 * published once committed.
 */
export class AddProductImageUseCase implements UseCase<
  AddProductImageCommand,
  AdminProductImageResult
> {
  constructor(private readonly deps: AddProductImageDependencies) {}

  async execute(command: AddProductImageCommand): Promise<AdminProductImageResult> {
    const { image } = command;
    const { deps } = this;
    // The stored id, in the case it is kept: the route may name it in capitals.
    const { productId } = await this.placeFor(command.productId);
    const mimeType = checkedImageType(image.bytes, deps.settings.maxSizeBytes, "single");
    const imageId = deps.ids.next();
    const key = deps.keys.originalKey(productId, imageId, mimeType);
    const imageOf = (position: number, now: Date) =>
      imageAt(productId, image, imageId, key, mimeType, position, now);
    // Checks the alt text before the upload; the position is set again once locked.
    imageOf(1, deps.clock.now());

    try {
      await deps.uploader.uploadOriginal(key, { bytes: image.bytes, mimeType });
      await deps.transaction.run(async () => {
        const { position } = await this.placeFor(productId);
        // The upload may have taken a while: the image is stamped from now on.
        await deps.images.saveAll([imageOf(position, deps.clock.now())]);
      });
    } catch (error) {
      // The key is removed even if its upload failed, since it may have been stored anyway.
      deps.background.run(`Removing the original of an image not added (${key})`, () =>
        deps.uploader.discardOriginals([key]),
      );
      throw error;
    }

    deps.background.run("Publishing an uploaded product image", () =>
      deps.events.publish(new ProductImageUploadedEvent(imageId)),
    );
    const result = await deps.queries.findImageById(imageId);
    if (!result) {
      throw new Error(`Image ${imageId} was not found after it was added`);
    }
    return result;
  }

  /**
   * The product the image goes to, and where it goes: after its images, which are numbered
   * from 1 with no gaps. Inside a transaction the product is locked first.
   */
  private async placeFor(id: string): Promise<{ productId: string; position: number }> {
    const product = await loadProduct(this.deps.products, id);
    if (product.isDeleted()) {
      throw new ProductDeletedError();
    }
    const count = await this.deps.images.countByProduct(product.getId());
    this.deps.policy.assertRoomForOne(count);
    return { productId: product.getId(), position: count + 1 };
  }
}

/** The new image; a long alt text speaks of "the image", the only one sent. */
function imageAt(
  productId: string,
  image: AddProductImageCommand["image"],
  imageId: string,
  key: string,
  mimeType: ProductImageMimeType,
  position: number,
  now: Date,
): ProductImage {
  try {
    return ProductImage.register({
      id: imageId,
      productId,
      position,
      originalKey: key,
      altText: image.altText,
      mimeType,
      sizeBytes: image.bytes.length,
      now,
    });
  } catch (error) {
    if (error instanceof InvalidImageError) {
      throw new InvalidImageError(error.reason, "single");
    }
    throw error;
  }
}
