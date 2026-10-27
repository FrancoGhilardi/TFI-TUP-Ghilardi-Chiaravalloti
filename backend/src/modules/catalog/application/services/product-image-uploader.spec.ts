import { FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import { ImageUploadFailedError } from "../errors/image-upload-failed-error.js";
import { ProductImageUploader } from "./product-image-uploader.js";

class RecordingStorage extends FileStorage {
  readonly calls: unknown[][] = [];
  failure?: Error;

  upload(bucket: StorageBucket, key: string, body: Uint8Array, contentType: string) {
    this.calls.push(["upload", bucket, key, body.length, contentType]);
    return this.failure ? Promise.reject(this.failure) : Promise.resolve();
  }

  remove(bucket: StorageBucket, keys: string[]) {
    this.calls.push(["remove", bucket, keys]);
    return this.failure ? Promise.reject(this.failure) : Promise.resolve();
  }

  signedUrls(): Promise<(string | null)[]> {
    return Promise.reject(new Error("Not used"));
  }

  publicUrl(): string {
    throw new Error("Not used");
  }
}

describe("ProductImageUploader", () => {
  const setUp = () => {
    const storage = new RecordingStorage();
    return { storage, uploader: new ProductImageUploader(storage) };
  };

  it("uploads the original to the private storage, under its key", async () => {
    const { storage, uploader } = setUp();

    await uploader.uploadOriginal("products/product-1/image-1.webp", {
      bytes: Uint8Array.from([1, 2, 3]),
      mimeType: "image/webp",
    });

    expect(storage.calls).toEqual([
      ["upload", StorageBucket.PRIVATE, "products/product-1/image-1.webp", 3, "image/webp"],
    ]);
  });

  it("reports a failed upload as such, keeping the storage error", async () => {
    const { storage, uploader } = setUp();
    storage.failure = new Error("storage down");

    await expect(
      uploader.uploadOriginal("products/product-1/image-1.png", {
        bytes: Uint8Array.from([1]),
        mimeType: "image/png",
      }),
    ).rejects.toThrow(
      expect.objectContaining({ constructor: ImageUploadFailedError, cause: storage.failure }),
    );
  });

  it("removes the originals, and does nothing without keys", async () => {
    const { storage, uploader } = setUp();

    await uploader.discardOriginals(["a.jpg", "b.png"]);
    await uploader.discardOriginals([]);

    expect(storage.calls).toEqual([["remove", StorageBucket.PRIVATE, ["a.jpg", "b.png"]]]);
  });

  it("rejects with the storage failure when removing fails", async () => {
    const { storage, uploader } = setUp();
    storage.failure = new Error("storage down");

    await expect(uploader.discardOriginals(["a.jpg"])).rejects.toBe(storage.failure);
  });
});
