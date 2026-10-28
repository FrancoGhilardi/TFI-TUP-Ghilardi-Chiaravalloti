import { PRODUCT_IMAGES_MAX, PRODUCT_IMAGES_MIN } from "../catalog-limits.js";
import { InvalidImageCountError } from "../errors/invalid-image-count-error.js";
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

  /** A product with `current` images has room for one more, added on its own. */
  assertRoomForOne(current: number): void {
    if (current >= ProductImagePolicy.MAX_IMAGES) {
      throw new ProductImageLimitReachedError();
    }
  }
}
