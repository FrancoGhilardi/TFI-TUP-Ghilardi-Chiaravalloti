/** How a run over the stalled images went, image by image. */
export interface StaleImagesResult {
  processed: number;
  /** No longer pending when its turn came: processed, replaced or deleted meanwhile. */
  skipped: number;
  /** Each failure, by image: it is left failed, to be retried by hand. */
  failures: { imageId: string; cause: unknown }[];
}
