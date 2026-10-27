import { type FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import type { ProductImageMimeType } from "../../domain/entities/product-image.js";
import { ImageUploadFailedError } from "../errors/image-upload-failed-error.js";

export interface OriginalImageFile {
  bytes: Uint8Array;
  mimeType: ProductImageMimeType;
}

/** Uploads the original files of the images, and removes them when they are left unused. */
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
}
