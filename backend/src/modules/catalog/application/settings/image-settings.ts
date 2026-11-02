import { PRODUCT_IMAGE_MAX_BYTES } from "../../domain/catalog-limits.js";

/** Fixed values of the product images; none of them changes between environments. */
export class ImageSettings {
  readonly maxSizeBytes = PRODUCT_IMAGE_MAX_BYTES;
  /** How long the panel can show a private original through its link. */
  readonly signedUrlTtlSeconds = 600;
}
