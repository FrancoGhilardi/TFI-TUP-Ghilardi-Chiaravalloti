import { type FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import type { ProductImageMimeType } from "../../domain/entities/product-image.js";
import { ImageUploadFailedError } from "../errors/image-upload-failed-error.js";

/** A file the storage would not remove, with why. */
export interface LeftoverFile {
  key: string;
  cause: unknown;
}

/** Long enough to get past a short storage outage, short enough to keep a request waiting. */
const RETRY_DELAY_MS = 1000;

export interface OriginalImageFile {
  bytes: Uint8Array;
  mimeType: ProductImageMimeType;
}

/**
 * Uploads the files of the images, the originals and their public versions, and removes them
 * when they are left unused.
 */
export class ProductImageUploader {
  constructor(
    private readonly storage: FileStorage,
    private readonly retryDelayMs = RETRY_DELAY_MS,
  ) {}

  /** Keeps the original in the private storage, under the key `ImageKeyFactory` gave it. */
  async uploadOriginal(key: string, file: OriginalImageFile): Promise<void> {
    try {
      await this.storage.upload(StorageBucket.PRIVATE, key, file.bytes, file.mimeType);
    } catch (error) {
      throw new ImageUploadFailedError(error);
    }
  }

  /** Rejects with the storage failure, so the caller can report the files left behind. */
  async discardOriginals(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.storage.remove(StorageBucket.PRIVATE, keys);
    }
  }

  /** The uploaded original; rejects with the storage failure, also for a missing key. */
  downloadOriginal(key: string): Promise<Uint8Array> {
    return this.storage.download(StorageBucket.PRIVATE, key);
  }

  /** Keeps a WebP public version in the public storage; rejects with the storage failure. */
  uploadPublic(key: string, bytes: Uint8Array): Promise<void> {
    return this.storage.upload(StorageBucket.PUBLIC, key, bytes, "image/webp");
  }

  /**
   * Removes the original and the public version of a deleted image at once, each tried again
   * after a short wait, since a file left behind would never be removed. Gives the files that
   * are still there, with why.
   */
  async discardDeleted(
    originalKey: string,
    publicKey: string | undefined,
  ): Promise<LeftoverFile[]> {
    const removals: [StorageBucket, string][] = [[StorageBucket.PRIVATE, originalKey]];
    if (publicKey !== undefined) {
      removals.push([StorageBucket.PUBLIC, publicKey]);
    }
    const left = await Promise.all(
      removals.map(([bucket, key]) => this.removeWithRetry(bucket, key)),
    );
    return left.filter((file) => file !== undefined);
  }

  /** Rejects with the storage failure, as `discardOriginals` does. */
  async discardPublic(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.storage.remove(StorageBucket.PUBLIC, keys);
    }
  }

  private async removeWithRetry(
    bucket: StorageBucket,
    key: string,
  ): Promise<LeftoverFile | undefined> {
    try {
      await this.storage.remove(bucket, [key]);
      return undefined;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
    }
    try {
      await this.storage.remove(bucket, [key]);
      return undefined;
    } catch (cause) {
      return { key, cause };
    }
  }
}
