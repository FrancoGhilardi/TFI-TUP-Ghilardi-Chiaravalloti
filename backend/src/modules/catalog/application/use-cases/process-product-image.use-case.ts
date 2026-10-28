import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ImageProcessor, PublicImageVersion } from "../ports/image-processor.js";
import type { ImageKeyFactory } from "../services/image-key-factory.js";
import type { ProductImageUploader } from "../services/product-image-uploader.js";

/** `skipped`: the image was not pending, or stopped being so while it was processed. */
export type ImageProcessing = "processed" | "skipped";

export interface ProcessProductImageDependencies {
  images: ProductImageRepository;
  processor: ImageProcessor;
  keys: ImageKeyFactory;
  uploader: ProductImageUploader;
  ids: IdGenerator;
  transaction: TransactionManager;
}

/**
 * Makes the public version of a pending image and marks it processed, with its size; any
 * failure marks it failed instead and rejects with the cause, unless the image changed
 * meanwhile, which is only skipped. The work on the files runs out
 * of a transaction; the image is then read again locked and only changed if it is still the
 * same pending one, so running it twice, or along with a deletion or a replacement, never
 * leaves a wrong state. Each run names its file anew, so it only ever removes its own, and
 * never one an image is left pointing to. Removals are awaited: the run is already in the
 * background, and the app waits for it before closing.
 */
export class ProcessProductImageUseCase implements UseCase<string, ImageProcessing> {
  constructor(private readonly deps: ProcessProductImageDependencies) {}

  async execute(imageId: string): Promise<ImageProcessing> {
    const { deps } = this;
    const image = await deps.images.findById(imageId);
    if (!image?.isPending()) {
      return "skipped";
    }
    const { originalKey } = image;
    const publicKey = deps.keys.publicKey(image.productId, imageId, deps.ids.next());

    let version: PublicImageVersion;
    let uploading = false;
    try {
      const original = await deps.uploader.downloadOriginal(originalKey);
      version = await deps.processor.toPublicVersion(original);
      uploading = true;
      await deps.uploader.uploadPublic(publicKey, version.bytes);
    } catch (error) {
      // An upload that failed on this side may still have been stored.
      return this.fail(imageId, originalKey, error, uploading ? publicKey : undefined);
    }

    let outcome: { applied: boolean; previous?: string };
    try {
      outcome = await deps.transaction.run(async () => {
        const current = await deps.images.findById(imageId);
        if (!current?.isPending() || current.originalKey !== originalKey) {
          return { applied: false };
        }
        const previous = current.markProcessed({
          publicKey,
          width: version.width,
          height: version.height,
        });
        await deps.images.saveAll([current]);
        return { applied: true, previous };
      });
    } catch (error) {
      return this.afterUncertainSave(imageId, originalKey, publicKey, error);
    }

    if (!outcome.applied) {
      await this.discard(imageId, publicKey);
      return "skipped";
    }
    if (outcome.previous !== undefined) {
      await this.discard(imageId, outcome.previous);
    }
    return "processed";
  }

  /**
   * A failed save may still have been committed, its answer lost on the way: the stored image
   * tells. If it cannot be read, nothing is removed nor marked, and the run rejects.
   */
  private async afterUncertainSave(
    imageId: string,
    originalKey: string,
    publicKey: string,
    error: unknown,
  ): Promise<ImageProcessing> {
    let stored;
    try {
      stored = await this.deps.images.findById(imageId);
    } catch (readError) {
      throw new AggregateError(
        [error, readError],
        `Saving the processed image ${imageId} failed, and it could not be read again`,
        { cause: readError },
      );
    }
    if (stored?.publicKey === publicKey) {
      return "processed";
    }
    return this.fail(imageId, originalKey, error, publicKey);
  }

  /**
   * Removes this run's file, if it may exist, and marks the image failed if it is still the
   * same pending one. One deleted, replaced or processed meanwhile is skipped, not failed:
   * its original may well have been removed on the way, and nothing went wrong with it.
   * Otherwise rejects with the cause, along with any other failure on the way.
   */
  private async fail(
    imageId: string,
    originalKey: string,
    cause: unknown,
    publicKey: string | undefined,
  ): Promise<ImageProcessing> {
    const { deps } = this;
    const failures: unknown[] = [cause];
    if (publicKey !== undefined) {
      await deps.uploader.discardPublic([publicKey]).catch((error: unknown) => {
        failures.push(error);
      });
    }
    const marked = await deps.transaction
      .run(async () => {
        const current = await deps.images.findById(imageId);
        if (!current?.isPending() || current.originalKey !== originalKey) {
          return false;
        }
        current.markFailed();
        await deps.images.saveAll([current]);
        return true;
      })
      .catch((error: unknown) => {
        failures.push(error);
        return true;
      });
    if (!marked && failures.length === 1) {
      return "skipped";
    }
    const message = `Processing of image ${imageId} failed`;
    throw failures.length === 1
      ? new Error(message, { cause })
      : new AggregateError(failures, `${message}, and so did cleaning up after it`);
  }

  /** The image's state is right by now; a file left behind is only reported. */
  private async discard(imageId: string, publicKey: string): Promise<void> {
    try {
      await this.deps.uploader.discardPublic([publicKey]);
    } catch (error) {
      throw new Error(`Image ${imageId} is right, but its unused file ${publicKey} stays`, {
        cause: error,
      });
    }
  }
}
