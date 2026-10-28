import { type FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import type { ProductImageMimeType } from "../../domain/entities/product-image.js";
import { ImageUploadFailedError } from "../errors/image-upload-failed-error.js";

export interface OriginalImageFile {
  bytes: Uint8Array;
  mimeType: ProductImageMimeType;
}

/**
 * Uploads the files of the images, the originals and their public versions, and removes them
 * when they are left unused.
 */
export class ProductImageUploader {
  constructor(private readonly storage: FileStorage) {}

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

  /** Rejects with the storage failure, as `discardOriginals` does. */
  async discardPublic(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.storage.remove(StorageBucket.PUBLIC, keys);
    }
  }
}
