import { PRODUCT_IMAGES_MAX, PRODUCT_IMAGES_MIN } from "../catalog-limits.js";
import type { ProductImage } from "../entities/product-image.js";
import { InvalidImageCountError } from "../errors/invalid-image-count-error.js";
import { InvalidImageOrderError } from "../errors/invalid-image-order-error.js";
import { ProductImageLimitReachedError } from "../errors/product-image-limit-reached-error.js";

/** How many images a product can have: never fewer than 1 nor more than 5. */
export class ProductImagePolicy {
  static readonly MIN_IMAGES = PRODUCT_IMAGES_MIN;
  static readonly MAX_IMAGES = PRODUCT_IMAGES_MAX;

  /** `current` images plus the `incoming` ones must stay within the limits. */
  assertCanAdd(current: number, incoming: number): void {
    const total = current + incoming;
    if (
      incoming < 1 ||
      total < ProductImagePolicy.MIN_IMAGES ||
      total > ProductImagePolicy.MAX_IMAGES
    ) {
      throw new InvalidImageCountError();
    }
  }

  /**
   * Puts the product's `images` in the order of `orderedIds`, from position 1 with no gaps.
   * The ids have to be exactly those images, each once. Gives whether any image moved.
   */
  reorder(images: readonly ProductImage[], orderedIds: readonly string[]): boolean {
    const byId = new Map(images.map((image) => [image.getId(), image]));
    if (
      orderedIds.length !== images.length ||
      new Set(orderedIds).size !== orderedIds.length ||
      orderedIds.some((id) => !byId.has(id))
    ) {
      throw new InvalidImageOrderError();
    }
    let moved = false;
    orderedIds.forEach((id, index) => {
      const image = byId.get(id)!;
      if (image.position !== index + 1) {
        image.moveTo(index + 1);
        moved = true;
      }
    });
    return moved;
  }

  /** A product with `current` images has room for one more, added on its own. */
  assertRoomForOne(current: number): void {
    if (current >= ProductImagePolicy.MAX_IMAGES) {
      throw new ProductImageLimitReachedError();
    }
  }
}
