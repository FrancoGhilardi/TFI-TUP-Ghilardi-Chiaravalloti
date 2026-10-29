import { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import { Clock } from "../../../../shared/application/clock.js";
import {
  type ApplicationEvent,
  EventPublisher,
} from "../../../../shared/application/event-publisher.js";
import { FileStorage, StorageBucket } from "../../../../shared/application/file-storage.js";
import { IdGenerator } from "../../../../shared/application/id-generator.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { Money } from "../../../../shared/domain/value-objects/money.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { Product } from "../../domain/entities/product.js";
import type { ProductImage } from "../../domain/entities/product-image.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { ProductDeletedError } from "../../domain/errors/product-deleted-error.js";
import { ProductImageLimitReachedError } from "../../domain/errors/product-image-limit-reached-error.js";
import { ImageStatus } from "../../domain/image-status.js";
import { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import { ProductRepository } from "../../domain/repositories/product.repository.js";
import { ProductImagePolicy } from "../../domain/services/product-image.policy.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import { Sku } from "../../domain/value-objects/sku.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import { ImageUploadFailedError } from "../errors/image-upload-failed-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductImageUploadedEvent } from "../events/product-image-uploaded.event.js";
import { AdminProductQueries } from "../ports/admin-product-queries.js";
import { ImageKeyFactory } from "../services/image-key-factory.js";
import { ProductImageUploader } from "../services/product-image-uploader.js";
import { ImageSettings } from "../settings/image-settings.js";
import { AddProductImageUseCase } from "./add-product-image.use-case.js";

const CHECKED = new Date("2026-10-28T12:00:00.000Z");
const SAVED = new Date("2026-10-28T12:00:05.000Z");
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const KEY = "products/product-1/image-1.jpg";

class LoggingProducts extends ProductRepository {
  product: Product | null = null;

  constructor(private readonly log: string[]) {
    super();
  }

  findById(): Promise<Product | null> {
    this.log.push("load product");
    return Promise.resolve(this.product);
  }

  existsBySlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  lockSlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findExistingIds(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  save(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  clearExpiredMarks(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

class CountingImages extends ProductImageRepository {
  /** The count each call gives in turn; the last one stays. */
  counts = [2];
  saved: ProductImage[] = [];
  failSave = false;

  constructor(private readonly log: string[]) {
    super();
  }

  countByProduct(): Promise<number> {
    this.log.push("count images");
    return Promise.resolve(this.counts.length > 1 ? this.counts.shift()! : this.counts[0]);
  }

  saveAll(images: ProductImage[]): Promise<void> {
    this.log.push("save image");
    if (this.failSave) {
      return Promise.reject(new Error("database down"));
    }
    this.saved.push(...images);
    return Promise.resolve();
  }

  findById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  delete(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

class LoggingStorage extends FileStorage {
  failUpload = false;

  constructor(private readonly log: string[]) {
    super();
  }

  upload(bucket: StorageBucket, key: string): Promise<void> {
    this.log.push(`upload ${bucket} ${key}`);
    return this.failUpload ? Promise.reject(new Error("storage down")) : Promise.resolve();
  }

  remove(bucket: StorageBucket, keys: string[]): Promise<void> {
    this.log.push(`remove ${bucket} ${keys.join(",")}`);
    return Promise.resolve();
  }

  download(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  signedUrls(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  publicUrl(): string {
    throw new Error("Not used");
  }
}

class LoggingTransaction extends TransactionManager {
  constructor(private readonly log: string[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.log.push("begin");
    try {
      const result = await work();
      this.log.push("commit");
      return result;
    } catch (error) {
      this.log.push("rollback");
      throw error;
    }
  }
}

class LoggingEvents extends EventPublisher {
  fail = false;

  constructor(private readonly log: string[]) {
    super();
  }

  publish(event: ApplicationEvent): Promise<void> {
    if (this.fail) {
      return Promise.reject(new Error("bus down"));
    }
    this.log.push(`publish ${(event as ProductImageUploadedEvent).imageId}`);
    return Promise.resolve();
  }
}

/** Runs the work right away and keeps the names of the tasks that failed. */
class ImmediateTasks extends BackgroundTasks {
  readonly pending: Promise<void>[] = [];
  readonly failures: string[] = [];

  run(name: string, work: () => Promise<unknown>): void {
    this.pending.push(
      work().then(
        () => undefined,
        () => {
          this.failures.push(name);
        },
      ),
    );
  }
}

class FixedIds extends IdGenerator {
  next(): string {
    return "image-1";
  }
}

/** Gives each time in turn, then keeps the last one. */
class SteppingClock extends Clock {
  times = [CHECKED, SAVED];

  now(): Date {
    return this.times.length > 1 ? this.times.shift()! : this.times[0];
  }
}

class StubQueries extends AdminProductQueries {
  findById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findImageById(id: string): Promise<AdminProductImageResult | null> {
    return Promise.resolve({ id } as AdminProductImageResult);
  }

  findImagesByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

function setUp() {
  const log: string[] = [];
  const products = new LoggingProducts(log);
  products.product = Product.create({
    id: "product-1",
    sku: Sku.fromValue("LMS-000007"),
    title: "Cuaderno A4",
    slug: Slug.fromText("Cuaderno A4"),
    price: Money.fromDecimal("1000"),
    categories: CategoryAssignment.fromIds(["cat-1"], "cat-1"),
    createdBy: "admin-1",
    now: CHECKED,
  });
  const images = new CountingImages(log);
  const storage = new LoggingStorage(log);
  const events = new LoggingEvents(log);
  const background = new ImmediateTasks();
  const add = new AddProductImageUseCase({
    products,
    images,
    policy: new ProductImagePolicy(),
    uploader: new ProductImageUploader(storage),
    keys: new ImageKeyFactory(),
    ids: new FixedIds(),
    settings: new ImageSettings(),
    transaction: new LoggingTransaction(log),
    events,
    background,
    queries: new StubQueries(),
    clock: new SteppingClock(),
  });
  const run = async (
    image: { bytes: Uint8Array; altText?: string } = { bytes: JPEG },
    productId = "product-1",
  ) => {
    try {
      return await add.execute({ productId, image });
    } finally {
      await Promise.all(background.pending);
    }
  };
  return { log, products, images, storage, events, background, run };
}

describe("AddProductImageUseCase", () => {
  it("checks, uploads, saves the image pending after the others and then publishes it", async () => {
    const { log, images, run } = setUp();

    await expect(run({ bytes: JPEG, altText: " Tapa " })).resolves.toEqual({ id: "image-1" });

    expect(log).toEqual([
      "load product",
      "count images",
      `upload PRIVATE ${KEY}`,
      "begin",
      "load product",
      "count images",
      "save image",
      "commit",
      "publish image-1",
    ]);
    expect(images.saved).toHaveLength(1);
    expect(images.saved[0]).toMatchObject({
      productId: "product-1",
      position: 3,
      originalKey: KEY,
      altText: "Tapa",
      mimeType: "image/jpeg",
      sizeBytes: JPEG.length,
      status: ImageStatus.PENDING,
      createdAt: SAVED,
    });
  });

  it("names the files and the image after the stored product id, whatever its case in the route", async () => {
    const { log, images, run } = setUp();

    await run({ bytes: JPEG }, "PRODUCT-1");

    expect(log).toContain(`upload PRIVATE ${KEY}`);
    expect(images.saved[0]).toMatchObject({ productId: "product-1", originalKey: KEY });
  });

  it("answers 404 for an unknown product, before anything else", async () => {
    const { log, products, run } = setUp();
    products.product = null;

    await expect(run()).rejects.toThrow(ProductNotFoundError);
    expect(log).toEqual(["load product"]);
  });

  it("refuses a deleted product, before uploading", async () => {
    const { log, products, run } = setUp();
    products.product!.softDelete("admin-1", CHECKED);

    await expect(run()).rejects.toThrow(ProductDeletedError);
    expect(log).toEqual(["load product"]);
  });

  it("refuses a product that already has 5 images, before uploading", async () => {
    const { log, images, run } = setUp();
    images.counts = [5];

    await expect(run()).rejects.toThrow(ProductImageLimitReachedError);
    expect(log).toEqual(["load product", "count images"]);
  });

  it.each([
    ["of another format", { bytes: GIF }, "La imagen tiene que ser JPEG, PNG o WebP."],
    [
      "too big",
      { bytes: new Uint8Array(10 * 1024 * 1024 + 1).fill(0xff) },
      "La imagen no puede pesar más de 10 MB.",
    ],
    [
      "with a long alt text",
      { bytes: JPEG, altText: "a".repeat(256) },
      "La imagen no puede tener un texto alternativo de más de 255 caracteres.",
    ],
  ])(
    "refuses a file %s, speaking of the only image, before uploading",
    async (_l, image, message) => {
      const { log, run } = setUp();

      const error = await run(image).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(InvalidImageError);
      expect(error).toMatchObject({ code: "INVALID_IMAGE", message });
      expect(log.some((entry) => entry.startsWith("upload"))).toBe(false);
    },
  );

  it("removes the original when the limit is reached while it was uploading", async () => {
    const { log, images, background, run } = setUp();
    images.counts = [4, 5];

    await expect(run()).rejects.toThrow(ProductImageLimitReachedError);
    expect(log.slice(-3)).toEqual(["count images", "rollback", `remove PRIVATE ${KEY}`]);
    expect(background.failures).toEqual([]);
  });

  it("removes the original when the image cannot be saved", async () => {
    const { log, images, run } = setUp();
    images.failSave = true;

    await expect(run()).rejects.toThrow("database down");
    expect(log.slice(-2)).toEqual(["rollback", `remove PRIVATE ${KEY}`]);
    expect(log.some((entry) => entry.startsWith("publish"))).toBe(false);
  });

  it("answers 502 when the upload fails, removing the key in case it was stored", async () => {
    const { log, storage, run } = setUp();
    storage.failUpload = true;

    await expect(run()).rejects.toThrow(ImageUploadFailedError);
    expect(log).not.toContain("begin");
    expect(log.at(-1)).toBe(`remove PRIVATE ${KEY}`);
  });

  it("still answers the image when its event cannot be published, reporting it", async () => {
    const { events, background, run } = setUp();
    events.fail = true;

    await expect(run()).resolves.toEqual({ id: "image-1" });
    expect(background.failures).toEqual(["Publishing an uploaded product image"]);
  });
});
