import { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
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
import { ProductImage } from "../../domain/entities/product-image.js";
import { ImageNotFailedError } from "../../domain/errors/image-not-failed-error.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { InvalidImageOrderError } from "../../domain/errors/invalid-image-order-error.js";
import { LastProductImageError } from "../../domain/errors/last-product-image-error.js";
import { ProductDeletedError } from "../../domain/errors/product-deleted-error.js";
import { ImageStatus } from "../../domain/image-status.js";
import { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import { ProductRepository } from "../../domain/repositories/product.repository.js";
import { ProductImagePolicy } from "../../domain/services/product-image.policy.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import { Sku } from "../../domain/value-objects/sku.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import { ImageUploadFailedError } from "../errors/image-upload-failed-error.js";
import { ProductImageNotFoundError } from "../errors/product-image-not-found-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import type { ProductImageUploadedEvent } from "../events/product-image-uploaded.event.js";
import { AdminProductQueries } from "../ports/admin-product-queries.js";
import { ImageKeyFactory } from "../services/image-key-factory.js";
import { ProductImageUploader } from "../services/product-image-uploader.js";
import { ImageSettings } from "../settings/image-settings.js";
import { ReorderProductImagesUseCase } from "./reorder-product-images.use-case.js";
import { ReplaceProductImageFileUseCase } from "./replace-product-image-file.use-case.js";
import { RetryProductImageProcessingUseCase } from "./retry-product-image-processing.use-case.js";
import { UpdateProductImageUseCase } from "./update-product-image.use-case.js";
import { DeleteProductImageUseCase } from "./delete-product-image.use-case.js";

const NOW = new Date("2026-10-28T12:00:00.000Z");
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const NEW_KEY = "products/product-1/image-1-version-1.png";

const imageAt = (id: string, position: number, productId = "product-1") =>
  ProductImage.register({
    id,
    productId,
    position,
    originalKey: `products/${productId}/${id}.jpg`,
    altText: "Tapa",
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    now: NOW,
  });

class LoggingProducts extends ProductRepository {
  product: Product | null;

  constructor(private readonly log: string[]) {
    super();
    this.product = Product.create({
      id: "product-1",
      sku: Sku.fromValue("LMS-000007"),
      title: "Cuaderno A4",
      slug: Slug.fromText("Cuaderno A4"),
      price: Money.fromDecimal("1000"),
      categories: CategoryAssignment.fromIds(["cat-1"], "cat-1"),
      createdBy: "admin-1",
      now: NOW,
    });
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

/** What a database gives: a copy, so a change counts only once saved. */
const copyOf = (image: ProductImage) =>
  ProductImage.reconstitute({
    id: image.getId(),
    productId: image.productId,
    position: image.position,
    originalKey: image.originalKey,
    publicKey: image.publicKey,
    altText: image.altText,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    sizeBytes: image.sizeBytes,
    status: image.status,
    createdAt: image.createdAt,
  });

class InMemoryImages extends ProductImageRepository {
  readonly stored = new Map<string, ProductImage>();
  failSave = false;
  failFind = false;

  constructor(private readonly log: string[]) {
    super();
    for (const image of [imageAt("image-1", 1), imageAt("image-2", 2), imageAt("image-3", 3)]) {
      this.stored.set(image.getId(), image);
    }
    this.stored.set("other-1", imageAt("other-1", 1, "product-2"));
  }

  findById(id: string): Promise<ProductImage | null> {
    this.log.push(`load image ${id}`);
    if (this.failFind) {
      return Promise.reject(new Error("db gone"));
    }
    const image = this.stored.get(id);
    return Promise.resolve(image ? copyOf(image) : null);
  }

  findByProduct(productId: string): Promise<ProductImage[]> {
    this.log.push("load images");
    return Promise.resolve(
      [...this.stored.values()]
        .filter((image) => image.productId === productId)
        .sort((a, b) => a.position - b.position)
        .map(copyOf),
    );
  }

  saveAll(images: ProductImage[]): Promise<void> {
    this.log.push(`save ${images.map((image) => image.getId()).join(",")}`);
    if (this.failSave) {
      return Promise.reject(new Error("database down"));
    }
    for (const image of images) {
      this.stored.set(image.getId(), copyOf(image));
    }
    return Promise.resolve();
  }

  countByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  delete(id: string): Promise<void> {
    this.log.push(`delete ${id}`);
    this.stored.delete(id);
    return Promise.resolve();
  }
}

class LoggingStorage extends FileStorage {
  failUpload = false;
  /** How many removals fail before they work again. */
  failRemoves = 0;

  constructor(private readonly log: string[]) {
    super();
  }

  upload(bucket: StorageBucket, key: string): Promise<void> {
    this.log.push(`upload ${bucket} ${key}`);
    return this.failUpload ? Promise.reject(new Error("storage down")) : Promise.resolve();
  }

  remove(bucket: StorageBucket, keys: string[]): Promise<void> {
    this.log.push(`remove ${bucket} ${keys.join(",")}`);
    if (this.failRemoves > 0) {
      this.failRemoves--;
      return Promise.reject(new Error("storage down"));
    }
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
  /** The next run commits, but its answer is lost. */
  loseCommit = false;

  constructor(private readonly log: string[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.log.push("begin");
    try {
      const result = await work();
      this.log.push("commit");
      if (this.loseCommit) {
        this.loseCommit = false;
        throw new Error("connection lost");
      }
      return result;
    } catch (error) {
      this.log.push("rollback");
      throw error;
    }
  }
}

class LoggingEvents extends EventPublisher {
  constructor(private readonly log: string[]) {
    super();
  }

  publish(event: ApplicationEvent): Promise<void> {
    this.log.push(`publish ${(event as ProductImageUploadedEvent).imageId}`);
    return Promise.resolve();
  }
}

class ImmediateTasks extends BackgroundTasks {
  readonly pending: Promise<unknown>[] = [];

  run(_name: string, work: () => Promise<unknown>): void {
    this.pending.push(work());
  }
}

class FixedIds extends IdGenerator {
  next(): string {
    return "version-1";
  }
}

class StubQueries extends AdminProductQueries {
  findById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findImageById(id: string): Promise<AdminProductImageResult | null> {
    return Promise.resolve({ id } as AdminProductImageResult);
  }

  findImagesByProduct(productId: string): Promise<AdminProductImageResult[]> {
    return Promise.resolve([{ id: `images of ${productId}` } as AdminProductImageResult]);
  }

  findPage(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

function setUp() {
  const log: string[] = [];
  const products = new LoggingProducts(log);
  const images = new InMemoryImages(log);
  const storage = new LoggingStorage(log);
  const transaction = new LoggingTransaction(log);
  const events = new LoggingEvents(log);
  const background = new ImmediateTasks();
  const queries = new StubQueries();
  const settle = async <T>(work: Promise<T>) => {
    try {
      return await work;
    } finally {
      await Promise.all(background.pending);
    }
  };
  const reorder = new ReorderProductImagesUseCase(
    products,
    images,
    new ProductImagePolicy(),
    transaction,
    queries,
  );
  const update = new UpdateProductImageUseCase(products, images, transaction, queries);
  const replace = new ReplaceProductImageFileUseCase({
    products,
    images,
    uploader: new ProductImageUploader(storage),
    keys: new ImageKeyFactory(),
    ids: new FixedIds(),
    settings: new ImageSettings(),
    transaction,
    events,
    background,
    queries,
  });
  const retry = new RetryProductImageProcessingUseCase(
    products,
    images,
    transaction,
    events,
    background,
    queries,
  );
  const remove = new DeleteProductImageUseCase(
    products,
    images,
    new ProductImagePolicy(),
    // No wait before a retry, so the tests stay fast.
    new ProductImageUploader(storage, 0),
    transaction,
  );
  return {
    log,
    products,
    images,
    storage,
    transaction,
    settle,
    reorder,
    update,
    replace,
    retry,
    remove,
  };
}

const positions = (images: InMemoryImages) =>
  Object.fromEntries(
    [...images.stored.values()]
      .filter((image) => image.productId === "product-1")
      .map((image) => [image.getId(), image.position]),
  );

describe("ReorderProductImagesUseCase", () => {
  it("locks the product and then its images, saves the new order and gives the images", async () => {
    const { log, images, reorder } = setUp();

    await expect(
      reorder.execute({ productId: "product-1", imageIds: ["image-3", "image-1", "image-2"] }),
    ).resolves.toEqual([{ id: "images of product-1" }]);

    expect(log).toEqual([
      "begin",
      "load product",
      "load images",
      "save image-1,image-2,image-3",
      "commit",
    ]);
    expect(positions(images)).toEqual({ "image-3": 1, "image-1": 2, "image-2": 3 });
  });

  it("saves nothing when the order is the same", async () => {
    const { log, reorder } = setUp();

    await reorder.execute({ productId: "product-1", imageIds: ["image-1", "image-2", "image-3"] });

    expect(log.some((entry) => entry.startsWith("save"))).toBe(false);
  });

  it("refuses an order that is not the product's images, each once", async () => {
    const { reorder } = setUp();

    await expect(
      reorder.execute({ productId: "product-1", imageIds: ["image-1", "image-2", "other-1"] }),
    ).rejects.toThrow(InvalidImageOrderError);
  });
});

describe("UpdateProductImageUseCase", () => {
  it("changes the alt text in a transaction, after locking the product", async () => {
    const { log, images, update } = setUp();

    await expect(
      update.execute({ productId: "product-1", imageId: "image-2", altText: " Contratapa " }),
    ).resolves.toEqual({ id: "image-2" });

    expect(log).toEqual(["begin", "load product", "load image image-2", "save image-2", "commit"]);
    expect(images.stored.get("image-2")?.altText).toBe("Contratapa");
  });

  it("removes it with a blank text, and saves nothing for the same one", async () => {
    const { log, images, update } = setUp();

    await update.execute({ productId: "product-1", imageId: "image-1", altText: "Tapa" });
    expect(log.some((entry) => entry.startsWith("save"))).toBe(false);

    await update.execute({ productId: "product-1", imageId: "image-1", altText: " " });
    expect(images.stored.get("image-1")?.altText).toBeUndefined();
  });

  it("refuses a long alt text speaking of the image", async () => {
    const { update } = setUp();

    await expect(
      update.execute({ productId: "product-1", imageId: "image-1", altText: "a".repeat(256) }),
    ).rejects.toThrow(new InvalidImageError("altText", "single").message);
  });
});

describe("ReplaceProductImageFileUseCase", () => {
  it("uploads under a new key, replaces the original pending, then removes the old file and publishes", async () => {
    const { log, images, replace, settle } = setUp();
    images.stored.get("image-1")!.markProcessed({
      publicKey: "products/product-1/image-1-v1.webp",
      width: 800,
      height: 1000,
    });

    await expect(
      settle(replace.execute({ productId: "product-1", imageId: "image-1", bytes: PNG })),
    ).resolves.toEqual({ id: "image-1" });

    expect(log).toEqual([
      "load product",
      "load image image-1",
      `upload PRIVATE ${NEW_KEY}`,
      "begin",
      "load product",
      "load image image-1",
      "save image-1",
      "commit",
      "remove PRIVATE products/product-1/image-1.jpg",
      "publish image-1",
    ]);
    expect(images.stored.get("image-1")).toMatchObject({
      status: ImageStatus.PENDING,
      originalKey: NEW_KEY,
      mimeType: "image/png",
      sizeBytes: PNG.length,
      publicKey: "products/product-1/image-1-v1.webp",
      altText: "Tapa",
    });
  });

  it("refuses a file of another format before uploading", async () => {
    const { log, replace } = setUp();

    await expect(
      replace.execute({ productId: "product-1", imageId: "image-1", bytes: GIF }),
    ).rejects.toThrow("La imagen tiene que ser JPEG, PNG o WebP.");
    expect(log.some((entry) => entry.startsWith("upload"))).toBe(false);
  });

  it("removes the new file when the image cannot be saved, keeping the old one", async () => {
    const { log, images, replace, settle } = setUp();
    images.failSave = true;

    await expect(
      settle(replace.execute({ productId: "product-1", imageId: "image-1", bytes: PNG })),
    ).rejects.toThrow("database down");
    // Read again first: the save may have been committed with its answer lost.
    expect(log.slice(-3)).toEqual(["rollback", "load image image-1", `remove PRIVATE ${NEW_KEY}`]);
  });

  it("takes a save whose answer was lost as done when the image points to the new file", async () => {
    const { log, images, transaction, replace, settle } = setUp();
    transaction.loseCommit = true;

    await expect(
      settle(replace.execute({ productId: "product-1", imageId: "image-1", bytes: PNG })),
    ).resolves.toEqual({ id: "image-1" });
    expect(images.stored.get("image-1")?.originalKey).toBe(NEW_KEY);
    expect(log).toContain("remove PRIVATE products/product-1/image-1.jpg");
    expect(log).not.toContain(`remove PRIVATE ${NEW_KEY}`);
    expect(log.at(-1)).toBe("publish image-1");
  });

  it("removes nothing when a failed save cannot be checked", async () => {
    const { log, images, transaction, replace, settle } = setUp();
    transaction.loseCommit = true;
    let reads = 0;
    const find = images.findById.bind(images);
    images.findById = (id: string) =>
      ++reads <= 2 ? find(id) : Promise.reject(new Error("db gone"));

    const error = await settle(
      replace.execute({ productId: "product-1", imageId: "image-1", bytes: PNG }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AggregateError);
    expect(log.some((entry) => entry.startsWith("remove"))).toBe(false);
  });

  it("answers 502 when the upload fails, removing its key in case it was stored", async () => {
    const { log, storage, replace, settle } = setUp();
    storage.failUpload = true;

    await expect(
      settle(replace.execute({ productId: "product-1", imageId: "image-1", bytes: PNG })),
    ).rejects.toThrow(ImageUploadFailedError);
    expect(log).not.toContain("begin");
    expect(log.at(-1)).toBe(`remove PRIVATE ${NEW_KEY}`);
  });
});

describe("RetryProductImageProcessingUseCase", () => {
  it("sends a failed image back to pending and publishes it once committed", async () => {
    const { log, images, retry, settle } = setUp();
    images.stored.get("image-2")!.markFailed();

    await expect(
      settle(retry.execute({ productId: "product-1", imageId: "image-2" })),
    ).resolves.toEqual({ id: "image-2" });

    expect(log).toEqual([
      "begin",
      "load product",
      "load image image-2",
      "save image-2",
      "commit",
      "publish image-2",
    ]);
    expect(images.stored.get("image-2")?.status).toBe(ImageStatus.PENDING);
  });

  it("refuses an image whose processing did not fail", async () => {
    const { log, retry } = setUp();

    await expect(retry.execute({ productId: "product-1", imageId: "image-1" })).rejects.toThrow(
      ImageNotFailedError,
    );
    expect(log).not.toContain("publish image-1");
  });
});

describe("DeleteProductImageUseCase", () => {
  it("removes the image, numbers the others again and only then removes its files", async () => {
    const { log, images, remove } = setUp();
    images.stored.get("image-2")!.markProcessed({
      publicKey: "products/product-1/image-2-v1.webp",
      width: 800,
      height: 1000,
    });

    // Named in capitals, as a route may: it is the same image.
    await expect(remove.execute({ productId: "product-1", imageId: "IMAGE-2" })).resolves.toEqual({
      imageId: "image-2",
      leftovers: [],
    });

    expect(log).toEqual([
      "begin",
      "load product",
      "load images",
      "delete image-2",
      "save image-3",
      "commit",
      "remove PRIVATE products/product-1/image-2.jpg",
      "remove PUBLIC products/product-1/image-2-v1.webp",
    ]);
    expect(positions(images)).toEqual({ "image-1": 1, "image-3": 2 });
  });

  it("saves no other image when the one in the last position goes, and has no public file to remove without one", async () => {
    const { log, remove } = setUp();

    await remove.execute({ productId: "product-1", imageId: "image-3" });

    expect(log.filter((entry) => entry.startsWith("save"))).toEqual([]);
    expect(log.slice(-1)).toEqual(["remove PRIVATE products/product-1/image-3.jpg"]);
  });

  it("never removes the last image of a product, touching nothing", async () => {
    const { log, images, remove } = setUp();
    images.stored.delete("image-2");
    images.stored.delete("image-3");

    await expect(remove.execute({ productId: "product-1", imageId: "image-1" })).rejects.toThrow(
      LastProductImageError,
    );
    expect(log.some((entry) => /^(delete|save|remove)/.test(entry))).toBe(false);
  });

  it("answers 404 for an image of another product", async () => {
    const { remove } = setUp();

    await expect(remove.execute({ productId: "product-1", imageId: "other-1" })).rejects.toThrow(
      ProductImageNotFoundError,
    );
  });

  it("keeps the files when the deletion is not committed", async () => {
    const { log, images, remove } = setUp();
    images.failSave = true;

    await expect(remove.execute({ productId: "product-1", imageId: "image-1" })).rejects.toThrow(
      "database down",
    );
    expect(log.some((entry) => entry.startsWith("remove"))).toBe(false);
  });

  it("tries each file twice, and gives back the ones still there", async () => {
    const { log, storage, remove } = setUp();
    storage.failRemoves = 1;

    await expect(remove.execute({ productId: "product-1", imageId: "image-3" })).resolves.toEqual({
      imageId: "image-3",
      leftovers: [],
    });
    expect(log.filter((entry) => entry.startsWith("remove"))).toHaveLength(2);

    const again = setUp();
    again.storage.failRemoves = 2;
    await expect(
      again.remove.execute({ productId: "product-1", imageId: "image-3" }),
    ).resolves.toEqual({
      imageId: "image-3",
      leftovers: [{ key: "products/product-1/image-3.jpg", cause: new Error("storage down") }],
    });
  });

  it("refuses a deleted product", async () => {
    const { products, remove } = setUp();
    products.product!.softDelete("admin-1", NOW);

    await expect(remove.execute({ productId: "product-1", imageId: "image-1" })).rejects.toThrow(
      ProductDeletedError,
    );
  });
});

describe("every image operation", () => {
  const operations = (setup: ReturnType<typeof setUp>, imageId = "image-1") => [
    () => setup.reorder.execute({ productId: "product-1", imageIds: ["image-1"] }),
    () => setup.update.execute({ productId: "product-1", imageId, altText: "Tapa" }),
    () => setup.replace.execute({ productId: "product-1", imageId, bytes: PNG }),
    () => setup.retry.execute({ productId: "product-1", imageId }),
  ];

  it("answers 404 for an unknown product", async () => {
    const setup = setUp();
    setup.products.product = null;

    for (const operation of operations(setup)) {
      await expect(operation()).rejects.toThrow(ProductNotFoundError);
    }
  });

  it("refuses a deleted product", async () => {
    const setup = setUp();
    setup.products.product!.softDelete("admin-1", NOW);

    for (const operation of operations(setup)) {
      await expect(operation()).rejects.toThrow(ProductDeletedError);
    }
  });

  it.each(["missing", "other-1"])("answers 404 for the image %s", async (imageId) => {
    const setup = setUp();

    for (const operation of operations(setup, imageId).slice(1)) {
      await expect(operation()).rejects.toThrow(ProductImageNotFoundError);
    }
  });
});
