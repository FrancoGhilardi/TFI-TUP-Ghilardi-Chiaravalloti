import { Clock } from "../../../../shared/application/clock.js";
import { FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import { IdGenerator } from "../../../../shared/application/id-generator.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { ProductImage } from "../../domain/entities/product-image.js";
import { ImageStatus } from "../../domain/image-status.js";
import { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import { ImageProcessor, type PublicImageVersion } from "../ports/image-processor.js";
import { ImageKeyFactory } from "../services/image-key-factory.js";
import { ProductImageUploader } from "../services/product-image-uploader.js";
import { ImageSettings } from "../settings/image-settings.js";
import { ProcessProductImageUseCase } from "./process-product-image.use-case.js";

const ADDED = new Date("2026-10-28T11:00:00.000Z");
const NOW = new Date("2026-10-28T12:00:00.000Z");
const ORIGINAL = "products/product-1/image-1.jpg";
const PUBLIC = "products/product-1/image-1-vversion-1.webp";
const VERSION: PublicImageVersion = {
  bytes: Uint8Array.from([1, 2, 3]),
  width: 1200,
  height: 1500,
};

const imageWith = (
  overrides: {
    status?: ImageStatus;
    originalKey?: string;
    publicKey?: string;
    pendingSince?: Date;
    processingAttempts?: number;
  } = {},
) => {
  const status = overrides.status ?? ImageStatus.PENDING;
  return ProductImage.reconstitute({
    id: "image-1",
    productId: "product-1",
    position: 1,
    originalKey: overrides.originalKey ?? ORIGINAL,
    publicKey: overrides.publicKey,
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    status,
    pendingSince: status === ImageStatus.PENDING ? (overrides.pendingSince ?? ADDED) : undefined,
    processingAttempts: overrides.processingAttempts ?? 0,
    createdAt: ADDED,
  });
};

/** What a database gives: a copy, so a change counts only once saved. */
const copyOf = (image: ProductImage) =>
  ProductImage.reconstitute({
    id: image.getId(),
    productId: image.productId,
    position: image.position,
    originalKey: image.originalKey,
    publicKey: image.publicKey,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    sizeBytes: image.sizeBytes,
    status: image.status,
    pendingSince: image.pendingSince,
    processingAttempts: image.processingAttempts,
    createdAt: image.createdAt,
  });

class InMemoryImages extends ProductImageRepository {
  stored: ProductImage | null = imageWith();
  /** Reads that fail, counted from 1. */
  readonly failingReads = new Set<number>();
  private reads = 0;

  constructor(private readonly log: string[]) {
    super();
  }

  findById(): Promise<ProductImage | null> {
    this.log.push("find image");
    if (this.failingReads.has(++this.reads)) {
      return Promise.reject(new Error("db gone"));
    }
    return Promise.resolve(this.stored ? copyOf(this.stored) : null);
  }

  saveAll(images: ProductImage[]): Promise<void> {
    this.log.push(`save ${images.map((image) => image.status).join(",")}`);
    this.stored = copyOf(images[0]);
    return Promise.resolve();
  }

  findByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findStalePendingIds(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  delete(): Promise<never> {
    return Promise.reject(new Error("Not used"));
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
  /** Runs, counted from 1, that fail before their work. */
  readonly failing = new Set<number>();
  /** Runs, counted from 1, that commit but lose their answer. */
  readonly losing = new Set<number>();
  private runs = 0;

  constructor(private readonly log: string[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    const run = ++this.runs;
    this.log.push("begin");
    if (this.failing.has(run)) {
      this.log.push("rollback");
      throw new Error("database down");
    }
    const result = await work();
    this.log.push("commit");
    if (this.losing.has(run)) {
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

class FixedClock extends Clock {
  now(): Date {
    return NOW;
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
    settings: new ImageSettings(),
    clock: new FixedClock(),
  });
  const run = (pendingBefore?: Date) => useCase.execute("image-1", { pendingBefore });
  return { log, images, storage, processor, transaction, run };
}

const CLAIM = ["find image", "begin", "find image", "save PENDING", "commit"];

describe("ProcessProductImageUseCase", () => {
  it("counts the attempt, makes the public version out of a transaction and marks the image processed", async () => {
    const { log, images, run } = setUp();

    await expect(run()).resolves.toBe("processed");

    expect(log).toEqual([
      ...CLAIM,
      `download PRIVATE ${ORIGINAL}`,
      "process",
      `upload PUBLIC ${PUBLIC} image/webp`,
      "begin",
      "find image",
      "save PROCESSED",
      "commit",
    ]);
    expect(images.stored).toMatchObject({
      status: ImageStatus.PROCESSED,
      publicKey: PUBLIC,
      width: 1200,
      height: 1500,
      pendingSince: undefined,
      processingAttempts: 1,
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

  it("skips one that started to wait after the cutoff, as one replaced during a run over the stalled ones", async () => {
    const { log, images, run } = setUp();
    images.stored = imageWith({ pendingSince: NOW });

    await expect(run(ADDED)).resolves.toBe("skipped");
    await expect(setUp().run(ADDED)).resolves.toBe("processed");
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
    expect(log.slice(-3)).toEqual(["find image", "commit", `remove PUBLIC ${PUBLIC}`]);
  });

  it("marks the image failed when its original cannot be read, with nothing to remove", async () => {
    const { log, images, processor, run } = setUp();
    processor.fail = true;

    await expect(run()).rejects.toMatchObject({
      message: "Processing of image image-1 failed",
      cause: new Error("unreadable image"),
    });
    expect(images.stored).toMatchObject({ status: ImageStatus.FAILED, pendingSince: undefined });
    expect(log.some((entry) => entry.startsWith("remove"))).toBe(false);
  });

  it.each([
    [
      "the download",
      false,
      (setup: ReturnType<typeof setUp>) => {
        setup.storage.failDownload = true;
      },
    ],
    [
      "the upload",
      true,
      (setup: ReturnType<typeof setUp>) => {
        setup.storage.failUpload = true;
      },
    ],
    [
      "the save",
      true,
      (setup: ReturnType<typeof setUp>) => {
        setup.transaction.failing.add(2);
      },
    ],
  ])(
    "leaves the image pending for another try when %s fails, from now on",
    async (_l, removes, breakIt) => {
      const setup = setUp();
      breakIt(setup);

      await expect(setup.run()).rejects.toThrow(
        "Processing of image image-1 could not finish; it waits for another try",
      );
      expect(setup.images.stored).toMatchObject({
        status: ImageStatus.PENDING,
        pendingSince: NOW,
        processingAttempts: 1,
      });
      // Only a file that may have been stored is removed.
      expect(setup.log.includes(`remove PUBLIC ${PUBLIC}`)).toBe(removes);
    },
  );

  it("leaves the image failed after the last attempt, without processing it", async () => {
    const { log, images, run } = setUp();
    images.stored = imageWith({ processingAttempts: 3 });

    await expect(run()).rejects.toThrow(
      "Image image-1 is left failed: 3 processings started and none ended",
    );
    expect(images.stored).toMatchObject({ status: ImageStatus.FAILED });
    expect(log).toEqual(["find image", "begin", "find image", "save FAILED", "commit"]);
  });

  it("takes a save whose answer was lost as done when the image kept its new file", async () => {
    const { log, images, transaction, run } = setUp();
    transaction.losing.add(2);

    await expect(run()).resolves.toBe("processed");
    expect(images.stored).toMatchObject({ status: ImageStatus.PROCESSED, publicKey: PUBLIC });
    expect(log.some((entry) => entry.startsWith("remove"))).toBe(false);
  });

  it("removes nothing when a failed save cannot be checked", async () => {
    const { log, images, transaction, run } = setUp();
    transaction.failing.add(2);
    images.failingReads.add(3);

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
    expect(images.stored).toMatchObject({ status: ImageStatus.PROCESSED });
  });

  it("keeps every failure when cleaning up fails too", async () => {
    const { storage, transaction, run } = setUp();
    storage.failUpload = true;
    storage.failRemove = true;
    transaction.failing.add(2);

    const error = await run().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors.map((cause: Error) => cause.message)).toEqual([
      "storage down",
      "remove failed",
      "database down",
    ]);
  });

  it("skips, without failing, an image replaced while its processing failed", async () => {
    const { images, processor, run } = setUp();
    processor.fail = true;
    processor.meanwhile = () => {
      images.stored = imageWith({ originalKey: "products/product-1/image-1.png" });
    };

    await expect(run()).resolves.toBe("skipped");
    expect(images.stored).toMatchObject({ originalKey: "products/product-1/image-1.png" });
  });
});
