import type { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import type { EventPublisher } from "../../../../shared/application/event-publisher.js";
import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import type { ReplaceProductImageFileCommand } from "../dto/replace-product-image-file.command.js";
import { ProductImageUploadedEvent } from "../events/product-image-uploaded.event.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { imageResultOf, loadProductImage } from "../services/image-loading.js";
import { checkedImageType } from "../services/image-type.js";
import type { ImageKeyFactory } from "../services/image-key-factory.js";
import { loadEditableProduct } from "../services/product-loading.js";
import type { ProductImageUploader } from "../services/product-image-uploader.js";
import type { ImageSettings } from "../settings/image-settings.js";

export interface ReplaceProductImageFileDependencies {
  products: ProductRepository;
  images: ProductImageRepository;
  uploader: ProductImageUploader;
  keys: ImageKeyFactory;
  ids: IdGenerator;
  settings: ImageSettings;
  transaction: TransactionManager;
  events: EventPublisher;
  background: BackgroundTasks;
  queries: AdminProductQueries;
}

/**
 * Gives an image a new original file, which waits to be processed. Everything is checked
 * before the upload, out of the transaction, under a key of its own, since no file is ever
 * overwritten. Inside it the product and the image stay locked. If anything fails after the
 * upload, the new file is removed; once committed, the replaced one is, and the image is
 * published to be processed. Its public version stays shown until that processing ends.
 */
export class ReplaceProductImageFileUseCase implements UseCase<
  ReplaceProductImageFileCommand,
  AdminProductImageResult
> {
  constructor(private readonly deps: ReplaceProductImageFileDependencies) {}

  async execute(command: ReplaceProductImageFileCommand): Promise<AdminProductImageResult> {
    const { deps } = this;
    const product = await loadEditableProduct(deps.products, command.productId);
    // The stored ids, in the case they are kept: the route may name them in capitals.
    const productId = product.getId();
    const current = await loadProductImage(deps.images, productId, command.imageId);
    const imageId = current.getId();
    const mimeType = checkedImageType(command.bytes, deps.settings.maxSizeBytes, "single");
    const key = deps.keys.replacementOriginalKey(productId, imageId, mimeType, deps.ids.next());

    try {
      await deps.uploader.uploadOriginal(key, { bytes: command.bytes, mimeType });
    } catch (error) {
      // The key is removed even if its upload failed, since it may have been stored anyway.
      this.discardNew(key);
      throw error;
    }

    let previous: string;
    try {
      previous = await deps.transaction.run(async () => {
        await loadEditableProduct(deps.products, productId);
        const image = await loadProductImage(deps.images, productId, imageId);
        const replaced = image.replaceOriginal({
          originalKey: key,
          mimeType,
          sizeBytes: command.bytes.length,
        });
        await deps.images.saveAll([image]);
        return replaced;
      });
    } catch (error) {
      previous = await this.afterUncertainSave(imageId, key, current.originalKey, error);
    }

    deps.background.run(`Removing a replaced original (${previous})`, () =>
      deps.uploader.discardOriginals([previous]),
    );
    deps.background.run("Publishing a replaced product image", () =>
      deps.events.publish(new ProductImageUploadedEvent(imageId)),
    );
    return imageResultOf(deps.queries, imageId);
  }

  /**
   * A failed save may still have been committed, its answer lost on the way: if the stored
   * image already points to the new file, the replacement is done and `previousKey` is the
   * file it replaced. If it cannot be read, nothing is removed.
   */
  private async afterUncertainSave(
    imageId: string,
    key: string,
    previousKey: string,
    error: unknown,
  ): Promise<string> {
    let stored;
    try {
      stored = await this.deps.images.findById(imageId);
    } catch (readError) {
      throw new AggregateError(
        [error, readError],
        `Replacing the original of image ${imageId} failed, and it could not be read again`,
        { cause: readError },
      );
    }
    if (stored?.originalKey === key) {
      return previousKey;
    }
    this.discardNew(key);
    throw error;
  }

  private discardNew(key: string): void {
    this.deps.background.run(`Removing the original of an image not replaced (${key})`, () =>
      this.deps.uploader.discardOriginals([key]),
    );
  }
}
