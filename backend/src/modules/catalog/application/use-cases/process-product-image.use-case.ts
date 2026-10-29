import type { Clock } from "../../../../shared/application/clock.js";
import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImage } from "../../domain/entities/product-image.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ImageProcessor, PublicImageVersion } from "../ports/image-processor.js";
import type { ImageKeyFactory } from "../services/image-key-factory.js";
import type { ProductImageUploader } from "../services/product-image-uploader.js";
import type { ImageSettings } from "../settings/image-settings.js";

/** `skipped`: the image was not pending, or stopped being so while it was processed. */
export type ImageProcessing = "processed" | "skipped";

export interface ProcessProductImageOptions {
  /** Only an image waiting since then or earlier, as a run over the stalled ones picked it. */
  pendingBefore?: Date;
}

export interface ProcessProductImageDependencies {
  images: ProductImageRepository;
  processor: ImageProcessor;
  keys: ImageKeyFactory;
  uploader: ProductImageUploader;
  ids: IdGenerator;
  transaction: TransactionManager;
  settings: ImageSettings;
  clock: Clock;
}

type Settlement = "failed" | "postponed";

/**
 * Makes the public version of a pending image and marks it processed, with its size. Each
 * attempt is counted before it starts, so one that never ends, such as one that takes the
 * process down, still counts; past the last one the image is left failed. An original that
 * cannot be read leaves it failed at once; a failure outside the image, of the storage or the
 * database, leaves it pending for another try. Either way it rejects with the cause, unless
 * the image changed meanwhile, which is only skipped.
 *
 * The work on the files runs out of a transaction; the image is then read again locked and
 * only changed if it is still the same pending one, so running it twice, or along with a
 * deletion or a replacement, never leaves a wrong state. Each run names its file anew, so it
 * only ever removes its own. Removals are awaited: the run is already in the background, and
 * the app waits for it before closing.
 */
export class ProcessProductImageUseCase implements UseCase<string, ImageProcessing> {
  constructor(private readonly deps: ProcessProductImageDependencies) {}

  async execute(
    imageId: string,
    options: ProcessProductImageOptions = {},
  ): Promise<ImageProcessing> {
    const { deps } = this;
    const image = await deps.images.findById(imageId);
    if (!this.isDue(image, options)) {
      return "skipped";
    }
    const claim = await this.claimAttempt(imageId, options);
    if (claim === null) {
      return "skipped";
    }
    const { originalKey, productId } = claim;
    const publicKey = deps.keys.publicKey(productId, imageId, deps.ids.next());

    let original: Uint8Array;
    try {
      original = await deps.uploader.downloadOriginal(originalKey);
    } catch (error) {
      return this.settle(imageId, originalKey, error, undefined, "postponed");
    }
    let version: PublicImageVersion;
    try {
      version = await deps.processor.toPublicVersion(original);
    } catch (error) {
      return this.settle(imageId, originalKey, error, undefined, "failed");
    }
    try {
      await deps.uploader.uploadPublic(publicKey, version.bytes);
    } catch (error) {
      // An upload that failed on this side may still have been stored.
      return this.settle(imageId, originalKey, error, publicKey, "postponed");
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

  /** Pending, and waiting since the cutoff or earlier when there is one. */
  private isDue(
    image: ProductImage | null,
    { pendingBefore }: ProcessProductImageOptions,
  ): image is ProductImage {
    if (!image?.isPending()) {
      return false;
    }
    return (
      pendingBefore === undefined ||
      (image.pendingSince !== undefined && image.pendingSince <= pendingBefore)
    );
  }

  /**
   * Counts the attempt, the image locked and checked again; `null` when there is nothing to
   * do. Past the last attempt the image is left failed and the run rejects.
   */
  private async claimAttempt(
    imageId: string,
    options: ProcessProductImageOptions,
  ): Promise<{ originalKey: string; productId: string } | null> {
    const { deps } = this;
    const claim = await deps.transaction.run(async () => {
      const current = await deps.images.findById(imageId);
      if (!this.isDue(current, options)) {
        return null;
      }
      if (current.processingAttempts >= deps.settings.maxProcessingAttempts) {
        current.markFailed();
        await deps.images.saveAll([current]);
        return "exhausted" as const;
      }
      current.beginProcessingAttempt();
      await deps.images.saveAll([current]);
      return { originalKey: current.originalKey, productId: current.productId };
    });
    if (claim === "exhausted") {
      throw new Error(
        `Image ${imageId} is left failed: ${deps.settings.maxProcessingAttempts} processings started and none ended`,
      );
    }
    return claim;
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
    return this.settle(imageId, originalKey, error, publicKey, "postponed");
  }

  /**
   * Removes this run's file, if it may exist, and leaves the image failed or postponed if it is
   * still the same pending one. One deleted, replaced or processed meanwhile is skipped: its
   * original may well have been removed on the way, and nothing went wrong with it. Otherwise
   * rejects with the cause, along with any other failure on the way.
   */
  private async settle(
    imageId: string,
    originalKey: string,
    cause: unknown,
    publicKey: string | undefined,
    settlement: Settlement,
  ): Promise<ImageProcessing> {
    const { deps } = this;
    const failures: unknown[] = [cause];
    if (publicKey !== undefined) {
      await deps.uploader.discardPublic([publicKey]).catch((error: unknown) => {
        failures.push(error);
      });
    }
    const settled = await deps.transaction
      .run(async () => {
        const current = await deps.images.findById(imageId);
        if (!current?.isPending() || current.originalKey !== originalKey) {
          return false;
        }
        if (settlement === "failed") {
          current.markFailed();
        } else {
          current.postpone(deps.clock.now());
        }
        await deps.images.saveAll([current]);
        return true;
      })
      .catch((error: unknown) => {
        failures.push(error);
        return true;
      });
    if (!settled && failures.length === 1) {
      return "skipped";
    }
    const message =
      settlement === "failed"
        ? `Processing of image ${imageId} failed`
        : `Processing of image ${imageId} could not finish; it waits for another try`;
    throw failures.length === 1
      ? new Error(message, { cause })
      : new AggregateError(failures, `${message}, and cleaning up after it failed too`);
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
