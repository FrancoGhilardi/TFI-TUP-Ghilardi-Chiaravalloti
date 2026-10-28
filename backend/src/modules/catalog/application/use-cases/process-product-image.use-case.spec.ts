import { FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import { IdGenerator } from "../../../../shared/application/id-generator.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { ProductImage } from "../../domain/entities/product-image.js";
import { ImageStatus } from "../../domain/image-status.js";
import { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import { ImageProcessor, type PublicImageVersion } from "../ports/image-processor.js";
import { ImageKeyFactory } from "../services/image-key-factory.js";
import { ProductImageUploader } from "../services/product-image-uploader.js";
import { ProcessProductImageUseCase } from "./process-product-image.use-case.js";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const ORIGINAL = "products/product-1/image-1.jpg";
const PUBLIC = "products/product-1/image-1-vversion-1.webp";
const VERSION: PublicImageVersion = {
  bytes: Uint8Array.from([1, 2, 3]),
  width: 1200,
  height: 1500,
};

const imageWith = (
  overrides: { status?: ImageStatus; originalKey?: string; publicKey?: string } = {},
) =>
  ProductImage.reconstitute({
    id: "image-1",
    productId: "product-1",
    position: 1,
    originalKey: overrides.originalKey ?? ORIGINAL,
    publicKey: overrides.publicKey,
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    status: overrides.status ?? ImageStatus.PENDING,
    createdAt: NOW,
  });

class InMemoryImages extends ProductImageRepository {
  stored: ProductImage | null = imageWith();
  readonly saved: ProductImage[] = [];

  constructor(private readonly log: string[]) {
    super();
  }

  findById(): Promise<ProductImage | null> {
    this.log.push("find image");
    return Promise.resolve(this.stored);
  }

  saveAll(images: ProductImage[]): Promise<void> {
    this.log.push(`save ${images.map((image) => image.status).join(",")}`);
    this.saved.push(...images);
    return Promise.resolve();
  }

  countByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

class LoggingStorage extends FileStorage {
  failDownload = false;
  failUpload = false;
  failRemove = false;

  constructor(private readonly log: string[]) {
    super();
  }

  download(bucket: StorageBucket, key: string): Promise<Uint8Array> {
    this.log.push(`download ${bucket} ${key}`);
    return this.failDownload
      ? Promise.reject(new Error("storage down"))
      : Promise.resolve(Uint8Array.from([0xff, 0xd8, 0xff]));
  }

  upload(bucket: StorageBucket, key: string, _body: Uint8Array, contentType: string) {
    this.log.push(`upload ${bucket} ${key} ${contentType}`);
    return this.failUpload ? Promise.reject(new Error("storage down")) : Promise.resolve();
  }

  remove(bucket: StorageBucket, keys: string[]) {
    this.log.push(`remove ${bucket} ${keys.join(",")}`);
    return this.failRemove ? Promise.reject(new Error("remove failed")) : Promise.resolve();
  }

  signedUrls(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  publicUrl(): string {
    throw new Error("Not used");
  }
}

class StubProcessor extends ImageProcessor {
  /** Runs while the image is being processed, to change it meanwhile. */
  meanwhile?: () => void;
  fail = false;

  constructor(private readonly log: string[]) {
    super();
  }

  toPublicVersion(): Promise<PublicImageVersion> {
    this.log.push("process");
    this.meanwhile?.();
    return this.fail ? Promise.reject(new Error("unreadable image")) : Promise.resolve(VERSION);
  }
}

class LoggingTransaction extends TransactionManager {
  failNext = 0;
  /** The next run does its work and commits, but its answer is lost. */
  loseCommit = false;

  constructor(private readonly log: string[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.log.push("begin");
    if (this.failNext > 0) {
      this.failNext--;
      this.log.push("rollback");
      throw new Error("database down");
    }
    const result = await work();
    this.log.push("commit");
    if (this.loseCommit) {
      this.loseCommit = false;
      throw new Error("connection lost");
    }
    return result;
  }
}

class FixedIds extends IdGenerator {
  next(): string {
    return "version-1";
  }
}

function setUp() {
  const log: string[] = [];
  const images = new InMemoryImages(log);
  const storage = new LoggingStorage(log);
  const processor = new StubProcessor(log);
  const transaction = new LoggingTransaction(log);
  const useCase = new ProcessProductImageUseCase({
    images,
    processor,
    keys: new ImageKeyFactory(),
    uploader: new ProductImageUploader(storage),
    ids: new FixedIds(),
    transaction,
  });
  const run = () => useCase.execute("image-1");
  return { log, images, storage, processor, transaction, run };
}

describe("ProcessProductImageUseCase", () => {
  it("makes the public version out of the transaction and marks the image processed with its size", async () => {
    const { log, images, run } = setUp();

    await expect(run()).resolves.toBe("processed");

    expect(log).toEqual([
      "find image",
      `download PRIVATE ${ORIGINAL}`,
      "process",
      `upload PUBLIC ${PUBLIC} image/webp`,
      "begin",
      "find image",
      "save PROCESSED",
      "commit",
    ]);
    expect(images.saved[0]).toMatchObject({
      status: ImageStatus.PROCESSED,
      publicKey: PUBLIC,
      width: 1200,
      height: 1500,
    });
  });

  it("removes the public version the image had before, once the new one is saved", async () => {
    const { log, images, run } = setUp();
    images.stored = imageWith({ publicKey: "products/product-1/image-1-v1.webp" });

    await run();

    expect(log.at(-1)).toBe("remove PUBLIC products/product-1/image-1-v1.webp");
  });

  it.each([
    ["missing", null],
    ["processed", imageWith({ status: ImageStatus.PROCESSED, publicKey: PUBLIC })],
    ["failed", imageWith({ status: ImageStatus.FAILED })],
  ])("skips an image %s, touching nothing", async (_label, stored) => {
    const { log, images, run } = setUp();
    images.stored = stored;

    await expect(run()).resolves.toBe("skipped");
    expect(log).toEqual(["find image"]);
  });

  it.each([
    [
      "deleted",
      (images: InMemoryImages) => {
        images.stored = null;
      },
    ],
    [
      "replaced",
      (images: InMemoryImages) => {
        images.stored = imageWith({ originalKey: "products/product-1/image-1.png" });
      },
    ],
    [
      "processed elsewhere",
      (images: InMemoryImages) => {
        images.stored = imageWith({ status: ImageStatus.PROCESSED, publicKey: "other.webp" });
      },
    ],
  ])("leaves an image %s meanwhile as it is, removing the version made", async (_l, change) => {
    const { log, images, processor, run } = setUp();
    processor.meanwhile = () => change(images);

    await expect(run()).resolves.toBe("skipped");
    expect(images.saved).toEqual([]);
    expect(log.slice(-3)).toEqual(["find image", "commit", `remove PUBLIC ${PUBLIC}`]);
  });

  it.each([
    ["download", false, (setup: ReturnType<typeof setUp>) => (setup.storage.failDownload = true)],
    ["processing", false, (setup: ReturnType<typeof setUp>) => (setup.processor.fail = true)],
    ["upload", true, (setup: ReturnType<typeof setUp>) => (setup.storage.failUpload = true)],
  ])(
    "marks the image failed when the %s fails, rejecting with the cause",
    async (_l, removes, breakIt) => {
      const setup = setUp();
      breakIt(setup);

      const error = await setup.run().catch((caught: unknown) => caught);

      expect(error).toMatchObject({
        message: "Processing of image image-1 failed",
        cause: expect.any(Error) as unknown,
      });
      expect(setup.images.saved.map((image) => image.status)).toEqual([ImageStatus.FAILED]);
      expect(setup.images.saved[0].publicKey).toBeUndefined();
      // Only a file that may have been stored is removed.
      expect(setup.log.includes(`remove PUBLIC ${PUBLIC}`)).toBe(removes);
    },
  );

  it("marks the image failed and removes its file when saving it processed fails", async () => {
    const { log, images, transaction, run } = setUp();
    transaction.failNext = 1;

    await expect(run()).rejects.toThrow("Processing of image image-1 failed");
    expect(images.saved.map((image) => image.status)).toEqual([ImageStatus.FAILED]);
    expect(log).toContain(`remove PUBLIC ${PUBLIC}`);
  });

  it("takes a save whose answer was lost as done when the image kept its new file", async () => {
    const { log, images, transaction, run } = setUp();
    transaction.loseCommit = true;

    await expect(run()).resolves.toBe("processed");
    expect(images.stored).toMatchObject({ status: ImageStatus.PROCESSED, publicKey: PUBLIC });
    expect(log.some((entry) => entry.startsWith("remove"))).toBe(false);
  });

  it("removes nothing when a failed save cannot be checked", async () => {
    const { log, images, transaction, run } = setUp();
    transaction.failNext = 1;
    let reads = 0;
    images.findById = () => {
      reads++;
      return reads === 1 ? Promise.resolve(images.stored) : Promise.reject(new Error("db gone"));
    };

    const error = await run().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors.map((cause: Error) => cause.message)).toEqual([
      "database down",
      "db gone",
    ]);
    expect(log.some((entry) => entry.startsWith("remove"))).toBe(false);
  });

  it("reports a previous file it could not remove, with the image already processed", async () => {
    const { images, storage, run } = setUp();
    images.stored = imageWith({ publicKey: "products/product-1/image-1-v1.webp" });
    storage.failRemove = true;

    await expect(run()).rejects.toThrow(
      "Image image-1 is right, but its unused file products/product-1/image-1-v1.webp stays",
    );
    expect(images.saved.map((image) => image.status)).toEqual([ImageStatus.PROCESSED]);
  });

  it("keeps every failure when cleaning up fails too", async () => {
    const { storage, transaction, run } = setUp();
    storage.failUpload = true;
    storage.failRemove = true;
    transaction.failNext = 1;

    const error = await run().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors.map((cause: Error) => cause.message)).toEqual([
      "storage down",
      "remove failed",
      "database down",
    ]);
  });

  it("does not mark failed an image replaced while its processing failed", async () => {
    const { images, processor, run } = setUp();
    processor.fail = true;
    processor.meanwhile = () => {
      images.stored = imageWith({ originalKey: "products/product-1/image-1.png" });
    };

    await expect(run()).rejects.toThrow("Processing of image image-1 failed");
    expect(images.saved).toEqual([]);
  });
});
