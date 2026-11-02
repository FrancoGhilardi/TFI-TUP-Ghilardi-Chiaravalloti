import type { Clock } from "../../../../shared/application/clock.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import type { StaleImagesResult } from "../dto/stale-images.result.js";
import type { ImageSettings } from "../settings/image-settings.js";
import type { ProcessProductImageUseCase } from "./process-product-image.use-case.js";

const MINUTE_MS = 60_000;

/** Asked before each image: a run told to stop finishes the one going and starts no other. */
export type ShouldStop = () => boolean;

/**
 * Processes again the images still pending after the time a processing should take, such as
 * those whose processing a restart cut off. One after another, the oldest first and a few per
 * run, so Sharp never decodes several at once; one that started to wait after the cutoff, such
 * as one replaced during the run, is left to its own processing. Processing only touches an
 * image still pending with the same original, so running this any number of times is safe; a
 * failure is reported and the run goes on with the next image.
 */
export class ReprocessStaleImagesUseCase implements UseCase<ShouldStop, StaleImagesResult> {
  constructor(
    private readonly images: ProductImageRepository,
    private readonly process: ProcessProductImageUseCase,
    private readonly settings: ImageSettings,
    private readonly clock: Clock,
  ) {}

  async execute(shouldStop: ShouldStop = () => false): Promise<StaleImagesResult> {
    const pendingBefore = new Date(
      this.clock.now().getTime() - this.settings.staleAfterMinutes * MINUTE_MS,
    );
    const ids = await this.images.findStalePendingIds(pendingBefore, this.settings.staleBatchSize);
    const result: StaleImagesResult = { processed: 0, skipped: 0, failures: [] };
    for (const imageId of ids) {
      if (shouldStop()) {
        break;
      }
      try {
        if ((await this.process.execute(imageId, { pendingBefore })) === "processed") {
          result.processed++;
        } else {
          result.skipped++;
        }
      } catch (cause) {
        result.failures.push({ imageId, cause });
      }
    }
    return result;
  }
}
