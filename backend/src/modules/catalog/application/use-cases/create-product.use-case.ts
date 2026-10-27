import type { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import type { Clock } from "../../../../shared/application/clock.js";
import type { EventPublisher } from "../../../../shared/application/event-publisher.js";
import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UniqueSlugGenerator } from "../../../../shared/application/unique-slug-generator.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { Money } from "../../../../shared/domain/value-objects/money.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { Product } from "../../domain/entities/product.js";
import { ProductImage } from "../../domain/entities/product-image.js";
import { CategoryUnavailableError } from "../../domain/errors/category-unavailable-error.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { RelatedProductUnavailableError } from "../../domain/errors/related-product-unavailable-error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { ProductImagePolicy } from "../../domain/services/product-image.policy.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import { Sku } from "../../domain/value-objects/sku.js";
import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import type { CreateProductCommand } from "../dto/create-product.command.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductImageUploadedEvent } from "../events/product-image-uploaded.event.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import type { SkuGenerator } from "../ports/sku-generator.js";
import type { ImageSettings } from "../settings/image-settings.js";
import type { ImageKeyFactory } from "../services/image-key-factory.js";
import type { ProductImageUploader } from "../services/product-image-uploader.js";
import { detectImageType } from "../services/image-type.js";

interface Identity {
  sku: Sku;
  slug: Slug;
}

// Only to check every rule of the data before anything is uploaded; never stored.
const PREVIEW_IDENTITY: Identity = {
  sku: Sku.fromValue("LMS-000000"),
  slug: Slug.fromValue("preview"),
};

interface PendingImage {
  image: ProductImage;
  bytes: Uint8Array;
}

export interface CreateProductDependencies {
  products: ProductRepository;
  categories: CategoryRepository;
  images: ProductImageRepository;
  imagePolicy: ProductImagePolicy;
  imageSettings: ImageSettings;
  keys: ImageKeyFactory;
  uploader: ProductImageUploader;
  skus: SkuGenerator;
  slugs: UniqueSlugGenerator;
  ids: IdGenerator;
  transaction: TransactionManager;
  events: EventPublisher;
  background: BackgroundTasks;
  queries: AdminProductQueries;
  clock: Clock;
}

/**
 * Creates a product with its first images in one go. Everything is checked before a file is
 * uploaded; the originals go to the private storage before the transaction, so no transaction
 * stays open on a network call, and if anything fails from the first upload to the commit the
 * files already uploaded are removed. The images wait to be processed: one event per image is
 * published once the product is committed.
 */
export class CreateProductUseCase implements UseCase<
  CreateProductCommand,
  AdminProductDetailResult
> {
  constructor(private readonly deps: CreateProductDependencies) {}

  async execute(command: CreateProductCommand): Promise<AdminProductDetailResult> {
    const { ids, clock } = this.deps;
    const checkedAt = clock.now();
    const productId = ids.next();
    const categories = CategoryAssignment.fromIds(command.categoryIds, command.primaryCategoryId);
    // Once each, so the count of existing ones can be compared.
    const relatedIds = [...new Set(command.relatedProductIds ?? [])];
    // Checks the product data with the same rules the stored one will follow.
    buildProduct(command, productId, categories, relatedIds, PREVIEW_IDENTITY, checkedAt);
    const pending = this.pendingImages(command, productId, checkedAt);
    await this.assertCategoriesVisible(categories);
    await this.assertRelatedExist(relatedIds);

    const uploaded: string[] = [];
    try {
      // One at a time: a failure stops the rest. Each key is noted before its upload, since
      // one that fails on this side may still have been stored, and removing a missing key is
      // not a failure.
      for (const { image, bytes } of pending) {
        uploaded.push(image.originalKey);
        await this.deps.uploader.uploadOriginal(image.originalKey, {
          bytes,
          mimeType: image.mimeType,
        });
      }
      await this.deps.transaction.run(async () => {
        // Read again, now locked: a category or related product deleted meanwhile is seen, and
        // one being deleted waits for this product.
        await this.assertCategoriesVisible(categories);
        await this.assertRelatedExist(relatedIds);
        // The uploads may have taken a while: dates are checked and stamped from now on.
        const now = clock.now();
        const identity = await this.identityFor(command.title);
        await this.deps.products.save(
          buildProduct(command, productId, categories, relatedIds, identity, now),
        );
        await this.deps.images.saveAll(pending.map(({ image }) => registeredAt(image, now)));
      });
    } catch (error) {
      this.discard(uploaded);
      throw error;
    }

    this.publishUploaded(pending.map(({ image }) => image.getId()));
    const created = await this.deps.queries.findById(productId);
    if (!created) {
      throw new ProductNotFoundError();
    }
    return created;
  }

  /** The images in the order received, each with its format read from its bytes. */
  private pendingImages(command: CreateProductCommand, productId: string, now: Date) {
    const { imagePolicy, imageSettings, keys, ids } = this.deps;
    imagePolicy.assertCanAdd(0, command.images.length);
    return command.images.map(({ bytes, altText }, index): PendingImage => {
      const position = index + 1;
      if (bytes.length > imageSettings.maxSizeBytes) {
        throw new InvalidImageError("size", position);
      }
      const mimeType = detectImageType(bytes);
      if (mimeType === undefined) {
        throw new InvalidImageError("type", position);
      }
      const imageId = ids.next();
      const image = ProductImage.register({
        id: imageId,
        productId,
        position,
        originalKey: keys.originalKey(productId, imageId, mimeType),
        altText,
        mimeType,
        sizeBytes: bytes.length,
        now,
      });
      return { image, bytes };
    });
  }

  private async assertCategoriesVisible(categories: CategoryAssignment[]): Promise<void> {
    const ids = categories.map((assignment) => assignment.categoryId);
    const visible = await this.deps.categories.findVisibleByIds(ids);
    if (visible.length !== ids.length) {
      throw new CategoryUnavailableError();
    }
  }

  private async assertRelatedExist(relatedIds: string[]): Promise<void> {
    if (relatedIds.length === 0) {
      return;
    }
    const existing = await this.deps.products.findExistingIds(relatedIds);
    if (existing.length !== relatedIds.length) {
      throw new RelatedProductUnavailableError();
    }
  }

  private async identityFor(title: string): Promise<Identity> {
    const { skus, slugs, products } = this.deps;
    return {
      sku: await skus.next(),
      slug: await slugs.generate(title, (slug) => products.existsBySlug(slug)),
    };
  }

  /** Reported, not thrown: the client gets the failure that stopped the creation. */
  private discard(keys: string[]): void {
    if (keys.length === 0) {
      return;
    }
    this.deps.background.run(
      `Removing the originals of a product not created (${keys.join(", ")})`,
      () => this.deps.uploader.discardOriginals(keys),
    );
  }

  /**
   * After the commit, so nothing processes an image that was never saved. A failure is only
   * reported: the product exists, and its images stay pending until processed later.
   */
  private publishUploaded(imageIds: string[]): void {
    this.deps.background.run("Publishing the uploaded images of a new product", async () => {
      for (const imageId of imageIds) {
        await this.deps.events.publish(new ProductImageUploadedEvent(imageId));
      }
    });
  }
}

/** The same image, registered at the moment the product is saved. */
function registeredAt(image: ProductImage, now: Date): ProductImage {
  return ProductImage.register({
    id: image.getId(),
    productId: image.productId,
    position: image.position,
    originalKey: image.originalKey,
    altText: image.altText,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes ?? 0,
    now,
  });
}

function buildProduct(
  command: CreateProductCommand,
  id: string,
  categories: CategoryAssignment[],
  relatedIds: string[],
  identity: Identity,
  now: Date,
): Product {
  const product = Product.create({
    id,
    sku: identity.sku,
    title: command.title,
    slug: identity.slug,
    description: command.description,
    price: Money.fromDecimal(command.price),
    stock: command.stock,
    sortOrder: command.sortOrder,
    categories,
    createdBy: command.actorId,
    now,
  });
  if (command.sale) {
    product.startSale(Money.fromDecimal(command.sale.price), command.sale.endsAt, now);
  }
  if (command.newMark) {
    product.markAsNew(command.newMark.until, now);
  }
  product.setFeatured(command.isFeatured);
  product.setRelatedProducts(relatedIds);
  if (!command.isActive) {
    product.deactivate();
  }
  return product;
}
