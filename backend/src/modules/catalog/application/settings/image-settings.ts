import { PRODUCT_IMAGE_MAX_BYTES } from "../../domain/catalog-limits.js";

/** Fixed values of the product images; none of them changes between environments. */
export class ImageSettings {
  readonly maxSizeBytes = PRODUCT_IMAGE_MAX_BYTES;
  /** How long the panel can show a private original through its link. */
  readonly signedUrlTtlSeconds = 600;
  /** The public version: cropped to 4:5, at most this wide, and never enlarged. */
  readonly publicMaxWidth = 1200;
  readonly publicAspectRatio = { width: 4, height: 5 };
  /** WebP quality, from 1 to 100. */
  readonly publicQuality = 80;
  /** Larger originals fail instead of filling the memory while decoded. */
  readonly maxInputPixels = 40_000_000;
  /** A processing takes seconds; an image pending longer than this has stalled. */
  readonly staleAfterMinutes = 10;
  /** Stalled images processed per run, one after another; the rest wait for the next run. */
  readonly staleBatchSize = 20;
  /**
   * Processings an image gets before it is left failed: one that keeps being cut off, such as
   * by taking the process down, stops being retried.
   */
  readonly maxProcessingAttempts = 3;
}
