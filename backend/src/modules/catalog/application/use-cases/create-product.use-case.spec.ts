import { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import { Clock } from "../../../../shared/application/clock.js";
import {
  type ApplicationEvent,
  EventPublisher,
} from "../../../../shared/application/event-publisher.js";
import { FileStorage, type StorageBucket } from "../../../../shared/application/file-storage.js";
import { IdGenerator } from "../../../../shared/application/id-generator.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { UniqueSlugGenerator } from "../../../../shared/application/unique-slug-generator.js";
import { InvalidMoneyError } from "../../../../shared/domain/errors/invalid-money-error.js";
import { InvalidSlugError } from "../../../../shared/domain/errors/invalid-slug-error.js";
import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { Slug as SlugValue } from "../../../../shared/domain/value-objects/slug.js";
import { Category } from "../../domain/entities/category.js";
import type { Product } from "../../domain/entities/product.js";
import type { ProductImage } from "../../domain/entities/product-image.js";
import { CategoryUnavailableError } from "../../domain/errors/category-unavailable-error.js";
import { InvalidCategoryAssignmentError } from "../../domain/errors/invalid-category-assignment-error.js";
import { InvalidImageCountError } from "../../domain/errors/invalid-image-count-error.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { InvalidProductTitleError } from "../../domain/errors/invalid-product-title-error.js";
import { InvalidRelatedProductsError } from "../../domain/errors/invalid-related-products-error.js";
import { InvalidSaleEndError } from "../../domain/errors/invalid-sale-end-error.js";
import { RelatedProductUnavailableError } from "../../domain/errors/related-product-unavailable-error.js";
import { SalePriceNotLowerError } from "../../domain/errors/sale-price-not-lower-error.js";
import { ImageStatus } from "../../domain/image-status.js";
import { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import { ProductRepository } from "../../domain/repositories/product.repository.js";
import { ProductImagePolicy } from "../../domain/services/product-image.policy.js";
import { Sku } from "../../domain/value-objects/sku.js";
import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import type { CreateProductCommand } from "../dto/create-product.command.js";
import { ImageUploadFailedError } from "../errors/image-upload-failed-error.js";
import { ProductImageUploadedEvent } from "../events/product-image-uploaded.event.js";
import { AdminProductQueries } from "../ports/admin-product-queries.js";
import { SkuGenerator } from "../ports/sku-generator.js";
import { ImageKeyFactory } from "../services/image-key-factory.js";
import { ProductImageUploader } from "../services/product-image-uploader.js";
import { ImageSettings } from "../settings/image-settings.js";
import { CreateProductUseCase } from "./create-product.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const LATER = new Date("2026-11-22T12:00:00.000Z");
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);

class RecordingStorage extends FileStorage {
  uploads = 0;
  failOnUpload?: number;
  failRemove = false;

  constructor(private readonly events: string[]) {
    super();
  }

  upload(_bucket: StorageBucket, key: string): Promise<void> {
    this.uploads++;
    if (this.uploads === this.failOnUpload) {
      this.events.push(`upload failed ${key}`);
      return Promise.reject(new Error("storage down"));
    }
    this.events.push(`upload ${key}`);
    return Promise.resolve();
  }

  remove(_bucket: StorageBucket, keys: string[]): Promise<void> {
    this.events.push(`remove ${keys.join(",")}`);
    return this.failRemove ? Promise.reject(new Error("remove failed")) : Promise.resolve();
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

class FakeProducts extends ProductRepository {
  saved?: Product;
  existing: string[] = [];
  slugs: string[] = [];
  failSave = false;

  constructor(private readonly events: string[]) {
    super();
  }

  existsBySlug(slug: Slug): Promise<boolean> {
    return Promise.resolve(this.slugs.includes(slug.toString()));
  }

  lockSlug(slug: Slug): Promise<void> {
    this.events.push(`lock slug ${slug.toString()}`);
    return Promise.resolve();
  }

  findExistingIds(ids: string[]): Promise<string[]> {
    this.events.push(`check related ${ids.join(",")}`);
    return Promise.resolve(ids.filter((id) => this.existing.includes(id)));
  }

  save(product: Product): Promise<void> {
    if (this.failSave) {
      return Promise.reject(new Error("database down"));
    }
    this.events.push(`save product ${product.sku.toString()} ${product.slug.toString()}`);
    this.saved = product;
    return Promise.resolve();
  }

  findById(): Promise<Product | null> {
    return Promise.reject(new Error("Not used"));
  }

  clearExpiredMarks(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

class FakeCategories extends CategoryRepository {
  visible: string[] = ["cat-1", "cat-2"];

  constructor(private readonly events: string[]) {
    super();
  }

  findVisibleByIds(ids: string[]): Promise<Category[]> {
    this.events.push(`check categories ${ids.join(",")}`);
    return Promise.resolve(
      ids
        .filter((id) => this.visible.includes(id))
        .map((id) => Category.create({ id, name: id, slug: SlugValue.fromText(id), now: NOW })),
    );
  }

  findById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  findCurrentIds(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  existsByName(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  existsBySlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  findAncestorIds(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  countCurrentChildren(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  countProductsWhereOnlyCategory(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  lockHierarchy(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  lockSlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  save(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

class FakeImages extends ProductImageRepository {
  saved: ProductImage[] = [];

  constructor(private readonly events: string[]) {
    super();
  }

  saveAll(images: ProductImage[]): Promise<void> {
    this.events.push(`save images ${images.length}`);
    this.saved = images;
    return Promise.resolve();
  }
  countByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
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

class RecordingTransaction extends TransactionManager {
  constructor(private readonly events: string[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.events.push("begin");
    try {
      const result = await work();
      this.events.push("commit");
      return result;
    } catch (error) {
      this.events.push("rollback");
      throw error;
    }
  }
}

/** Runs each task right away and keeps its failure, as the real one would log it. */
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

  idle() {
    return Promise.all(this.pending);
  }
}

class RecordingEvents extends EventPublisher {
  readonly published: ApplicationEvent[] = [];
  fail = false;

  publish(event: ApplicationEvent): Promise<void> {
    if (this.fail) {
      return Promise.reject(new Error("bus down"));
    }
    this.published.push(event);
    return Promise.resolve();
  }
}

class SequentialIds extends IdGenerator {
  private count = 0;
  next(): string {
    this.count++;
    return this.count === 1 ? "product-1" : `image-${this.count - 1}`;
  }
}

/** Gives each time in turn, then keeps the last one. */
class SteppingClock extends Clock {
  times: Date[] = [NOW];

  now(): Date {
    return this.times.length > 1 ? this.times.shift()! : this.times[0];
  }
}

class FixedSkus extends SkuGenerator {
  constructor(private readonly events: string[]) {
    super();
  }
  next(): Promise<Sku> {
    this.events.push("next sku");
    return Promise.resolve(Sku.fromValue("LMS-000042"));
  }
}

class StubQueries extends AdminProductQueries {
  findById(id: string): Promise<AdminProductDetailResult | null> {
    return Promise.resolve({ id } as AdminProductDetailResult);
  }
  findImageById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findImagesByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findPage(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

function setUp() {
  const events: string[] = [];
  const storage = new RecordingStorage(events);
  const products = new FakeProducts(events);
  const categories = new FakeCategories(events);
  const images = new FakeImages(events);
  const tasks = new ImmediateTasks();
  const published = new RecordingEvents();
  const clock = new SteppingClock();
  const useCase = new CreateProductUseCase({
    products,
    categories,
    images,
    imagePolicy: new ProductImagePolicy(),
    imageSettings: new ImageSettings(),
    keys: new ImageKeyFactory(),
    uploader: new ProductImageUploader(storage),
    skus: new FixedSkus(events),
    slugs: new UniqueSlugGenerator(),
    ids: new SequentialIds(),
    transaction: new RecordingTransaction(events),
    events: published,
    background: tasks,
    queries: new StubQueries(),
    clock,
  });
  return { events, storage, products, categories, images, tasks, published, clock, useCase };
}

const command = (overrides: Partial<CreateProductCommand> = {}): CreateProductCommand => ({
  actorId: "user-1",
  title: "Cuaderno Rayado A4",
  price: "1500.50",
  stock: 10,
  isFeatured: false,
  isActive: true,
  categoryIds: ["cat-1", "cat-2"],
  primaryCategoryId: "cat-1",
  images: [{ bytes: JPEG, altText: " Tapa " }, { bytes: PNG }],
  ...overrides,
});

describe("CreateProductUseCase", () => {
  it("checks, uploads, saves in one transaction and only then publishes", async () => {
    const { events, published, tasks, useCase } = setUp();

    const result = await useCase.execute(command());
    await tasks.idle();

    expect(result.id).toBe("product-1");
    expect(events).toEqual([
      "check categories cat-1,cat-2",
      "upload products/product-1/image-1.jpg",
      "upload products/product-1/image-2.png",
      "begin",
      "check categories cat-1,cat-2",
      "next sku",
      "lock slug cuaderno-rayado-a4",
      "save product LMS-000042 cuaderno-rayado-a4",
      "save images 2",
      "commit",
    ]);
    expect(published).toEqual(
      expect.objectContaining({
        published: [
          new ProductImageUploadedEvent("image-1"),
          new ProductImageUploadedEvent("image-2"),
        ],
      }),
    );
  });

  it("saves the product with its data, author, categories and flags", async () => {
    const { products, useCase } = setUp();

    await useCase.execute(
      command({
        description: "Tapa dura",
        sale: { price: "1200", endsAt: LATER },
        newMark: { until: LATER },
        isFeatured: true,
        isActive: false,
        sortOrder: 3,
        relatedProductIds: [],
      }),
    );

    const product = products.saved!;
    expect(product).toMatchObject({
      title: "Cuaderno Rayado A4",
      description: "Tapa dura",
      stock: 10,
      onSale: true,
      saleEndsAt: LATER,
      featured: true,
      isNewFlag: true,
      newUntil: LATER,
      sortOrder: 3,
      active: false,
      createdBy: "user-1",
      updatedBy: "user-1",
      createdAt: NOW,
    });
    expect(product.price.toDecimalString()).toBe("1500.50");
    expect(product.salePrice?.toDecimalString()).toBe("1200.00");
    expect(product.getPrimaryCategoryId()).toBe("cat-1");
    expect(product.categories.map((assignment) => assignment.categoryId)).toEqual([
      "cat-1",
      "cat-2",
    ]);
  });

  it("registers the images pending, in order, with the format read from their bytes", async () => {
    const { images, clock, products, useCase } = setUp();
    // Saved once the uploads are done.
    clock.times = [NOW, LATER];

    await useCase.execute(command());

    expect(products.saved?.createdAt).toBe(LATER);
    expect(images.saved.map((image) => image.createdAt)).toEqual([LATER, LATER]);

    expect(images.saved).toEqual([
      expect.objectContaining({
        productId: "product-1",
        position: 1,
        originalKey: "products/product-1/image-1.jpg",
        mimeType: "image/jpeg",
        sizeBytes: JPEG.length,
        altText: "Tapa",
        status: ImageStatus.PENDING,
      }),
      expect.objectContaining({ position: 2, mimeType: "image/png", altText: undefined }),
    ]);
  });

  it("gives the slug the first free suffix", async () => {
    const { products, useCase } = setUp();
    products.slugs = ["cuaderno-rayado-a4"];

    await useCase.execute(command());

    expect(products.saved?.slug.toString()).toBe("cuaderno-rayado-a4-2");
  });

  it.each([
    ["New", "new-2"],
    ["Featured", "featured-2"],
  ])("never gives %o a slug a store route uses", async (title, slug) => {
    const { products, useCase } = setUp();

    await useCase.execute(command({ title }));

    expect(products.saved?.slug.toString()).toBe(slug);
  });

  it("cuts the slug of a long valid title instead of failing", async () => {
    const { products, useCase } = setUp();

    await useCase.execute(command({ title: "ß".repeat(200) }));

    expect(products.saved?.slug.toString()).toBe("s".repeat(220));
  });

  it("keeps the related products in order, checked again inside the transaction", async () => {
    const { events, products, useCase } = setUp();
    products.existing = ["other-1", "other-2"];

    await useCase.execute(command({ relatedProductIds: ["other-2", "other-1"] }));

    expect(products.saved?.relatedProductIds).toEqual(["other-2", "other-1"]);
    expect(events.filter((event) => event.startsWith("check related"))).toEqual([
      "check related other-2,other-1",
      "check related other-2,other-1",
    ]);
  });

  describe("refuses before uploading anything", () => {
    it.each([
      ["repeated categories", { categoryIds: ["cat-1", "cat-1"] }, InvalidCategoryAssignmentError],
      [
        "a primary category out of the list",
        { primaryCategoryId: "cat-3" },
        InvalidCategoryAssignmentError,
      ],
      ["no categories", { categoryIds: [] }, InvalidCategoryAssignmentError],
      [
        "a category that is not visible",
        { categoryIds: ["cat-1", "cat-9"] },
        CategoryUnavailableError,
      ],
      [
        "a related product that is gone",
        { relatedProductIds: ["gone-1"] },
        RelatedProductUnavailableError,
      ],
      [
        "a repeated related product",
        { relatedProductIds: ["other-1", "other-1"] },
        InvalidRelatedProductsError,
      ],
      [
        "more than 4 related products",
        { relatedProductIds: ["other-1", "other-2", "other-3", "other-4", "other-5"] },
        InvalidRelatedProductsError,
      ],
      ["a blank title", { title: "  " }, InvalidProductTitleError],
      ["a title without letters or digits", { title: "★★★" }, InvalidSlugError],
      ["a malformed price", { price: "15,50" }, InvalidMoneyError],
      ["a sale price not lower", { sale: { price: "1500.50" } }, SalePriceNotLowerError],
      ["a sale that already ended", { sale: { price: "100", endsAt: NOW } }, InvalidSaleEndError],
      ["no images", { images: [] }, InvalidImageCountError],
      [
        "six images",
        { images: Array.from({ length: 6 }, () => ({ bytes: JPEG })) },
        InvalidImageCountError,
      ],
    ] as const)("%s", async (_label, overrides, error) => {
      const { events, storage, useCase } = setUp();

      await expect(
        useCase.execute(command(overrides as Partial<CreateProductCommand>)),
      ).rejects.toThrow(error);

      expect(storage.uploads).toBe(0);
      expect(events).not.toContain("begin");
    });

    it("a file that is not an image, naming it", async () => {
      const { storage, useCase } = setUp();

      await expect(
        useCase.execute(
          command({ images: [{ bytes: JPEG }, { bytes: Uint8Array.from([1, 2, 3]) }] }),
        ),
      ).rejects.toThrow(
        expect.objectContaining({ constructor: InvalidImageError, reason: "type", position: 2 }),
      );
      expect(storage.uploads).toBe(0);
    });

    it("a file over the size limit", async () => {
      const { storage, useCase } = setUp();
      const heavy = new Uint8Array(new ImageSettings().maxSizeBytes + 1);
      heavy.set(JPEG);

      await expect(useCase.execute(command({ images: [{ bytes: heavy }] }))).rejects.toThrow(
        expect.objectContaining({ constructor: InvalidImageError, reason: "size", position: 1 }),
      );
      expect(storage.uploads).toBe(0);
    });
  });

  describe("when something fails after the first upload", () => {
    it("removes what was uploaded when an upload fails, and reports it as such", async () => {
      const { events, storage, tasks, products, useCase } = setUp();
      storage.failOnUpload = 2;

      await expect(useCase.execute(command())).rejects.toThrow(ImageUploadFailedError);
      await tasks.idle();

      expect(events).toEqual([
        "check categories cat-1,cat-2",
        "upload products/product-1/image-1.jpg",
        "upload failed products/product-1/image-2.png",
        // The failed one may have been stored all the same.
        "remove products/product-1/image-1.jpg,products/product-1/image-2.png",
      ]);
      expect(products.saved).toBeUndefined();
    });

    it("rolls back and removes every file when the transaction fails", async () => {
      const { events, products, tasks, published, useCase } = setUp();
      products.failSave = true;

      await expect(useCase.execute(command())).rejects.toThrow("database down");
      await tasks.idle();

      expect(events.slice(-2)).toEqual([
        "rollback",
        "remove products/product-1/image-1.jpg,products/product-1/image-2.png",
      ]);
      expect(published.published).toEqual([]);
    });

    it("rolls back and removes every file when a category is deleted meanwhile", async () => {
      const { events, categories, tasks, useCase } = setUp();
      // Visible on the first check only.
      let checks = 0;
      categories.findVisibleByIds = (ids) => {
        checks++;
        return checks === 1
          ? FakeCategories.prototype.findVisibleByIds.call(categories, ids)
          : Promise.resolve([]);
      };

      await expect(useCase.execute(command())).rejects.toThrow(CategoryUnavailableError);
      await tasks.idle();

      expect(events.at(-1)).toBe(
        "remove products/product-1/image-1.jpg,products/product-1/image-2.png",
      );
    });

    it("still answers with the original failure when the files cannot be removed, reporting them", async () => {
      const { storage, tasks, useCase } = setUp();
      storage.failOnUpload = 2;
      storage.failRemove = true;

      await expect(useCase.execute(command())).rejects.toThrow(ImageUploadFailedError);
      await tasks.idle();

      expect(tasks.failures).toEqual([
        "Removing the originals of a product not created (products/product-1/image-1.jpg, products/product-1/image-2.png)",
      ]);
    });

    it("removes only the file whose upload failed when it is the first one", async () => {
      const { events, storage, tasks, useCase } = setUp();
      storage.failOnUpload = 1;

      await expect(useCase.execute(command())).rejects.toThrow(ImageUploadFailedError);
      await tasks.idle();

      expect(events.at(-1)).toBe("remove products/product-1/image-1.jpg");
    });

    it("checks the dates again once the uploads are done, removing the files if one expired", async () => {
      const { events, clock, tasks, useCase } = setUp();
      // The sale ends while the files go up.
      clock.times = [NOW, LATER];

      await expect(
        useCase.execute(
          command({ sale: { price: "100", endsAt: new Date(NOW.getTime() + 1000) } }),
        ),
      ).rejects.toThrow(InvalidSaleEndError);
      await tasks.idle();

      expect(events.at(-1)).toBe(
        "remove products/product-1/image-1.jpg,products/product-1/image-2.png",
      );
    });
  });

  it("answers the created product even when publishing the events fails, reporting it", async () => {
    const { published, tasks, useCase } = setUp();
    published.fail = true;

    await expect(useCase.execute(command())).resolves.toMatchObject({ id: "product-1" });
    await tasks.idle();

    expect(tasks.failures).toEqual(["Publishing the uploaded images of a new product"]);
  });
});
