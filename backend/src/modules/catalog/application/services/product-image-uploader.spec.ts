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

  download(): Promise<never> {
    return Promise.reject(new Error("Not used"));
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

  it("uploads a public version as WebP to the public storage, and removes them there", async () => {
    const { storage, uploader } = setUp();

    await uploader.uploadPublic("products/product-1/image-1-v1.webp", Uint8Array.from([1, 2]));
    await uploader.discardPublic(["products/product-1/image-1-v0.webp"]);
    await uploader.discardPublic([]);

    expect(storage.calls).toEqual([
      ["upload", StorageBucket.PUBLIC, "products/product-1/image-1-v1.webp", 2, "image/webp"],
      ["remove", StorageBucket.PUBLIC, ["products/product-1/image-1-v0.webp"]],
    ]);
  });

  it("rejects with the storage failure when a public version cannot be uploaded", async () => {
    const { storage, uploader } = setUp();
    storage.failure = new Error("storage down");

    await expect(uploader.uploadPublic("a.webp", Uint8Array.from([1]))).rejects.toBe(
      storage.failure,
    );
  });

  describe("discardDeleted", () => {
    it("removes both files of a deleted image at once", async () => {
      const storage = new RecordingStorage();
      const releases: (() => void)[] = [];
      storage.remove = (bucket: StorageBucket, keys: string[]) => {
        storage.calls.push(["remove", bucket, keys]);
        return new Promise<void>((resolve) => releases.push(resolve));
      };
      const removal = new ProductImageUploader(storage, 0).discardDeleted("a.jpg", "a.webp");
      await Promise.resolve();

      expect(storage.calls).toEqual([
        ["remove", StorageBucket.PRIVATE, ["a.jpg"]],
        ["remove", StorageBucket.PUBLIC, ["a.webp"]],
      ]);
      releases.forEach((release) => release());
      await expect(removal).resolves.toEqual([]);
    });

    it("waits before trying a file again, and gives it back with why when it stays", async () => {
      vi.useFakeTimers();
      try {
        const storage = new RecordingStorage();
        storage.failure = new Error("storage down");
        const removal = new ProductImageUploader(storage, 1000).discardDeleted("a.jpg", undefined);
        await vi.advanceTimersByTimeAsync(999);
        expect(storage.calls).toHaveLength(1);

        await vi.advanceTimersByTimeAsync(1);

        await expect(removal).resolves.toEqual([{ key: "a.jpg", cause: storage.failure }]);
        expect(storage.calls).toHaveLength(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
