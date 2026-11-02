import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import { stackWithCauses } from "../../../../shared/application/error-stack.js";
import { ReprocessStaleImagesUseCase } from "../../application/use-cases/reprocess-stale-images.use-case.js";

/** The job's name in the scheduler registry. */
export const STALE_IMAGES_JOB = "stale-images";

/**
 * Every 5 minutes, and once when the app starts, processes again the images whose processing
 * stalled; a restart is just when a processing gets cut off. Each run goes through the
 * background tasks, which the app waits for before closing, and a run never starts while the
 * previous one is still going. When the app starts closing, the run finishes the image it is on
 * and starts no other, so closing never waits for a whole batch.
 */
@Injectable()
export class StaleImagesScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(StaleImagesScheduler.name);
  private running = false;
  private stopping = false;

  constructor(
    private readonly reprocessStaleImages: ReprocessStaleImagesUseCase,
    private readonly background: BackgroundTasks,
  ) {}

  onApplicationBootstrap(): void {
    this.background.run("Reprocessing stalled images at startup", () => this.run());
  }

  /** Runs before the app waits for its background tasks, so the run going stops early. */
  onModuleDestroy(): void {
    this.stopping = true;
  }

  @Cron("*/5 * * * *", { name: STALE_IMAGES_JOB })
  schedule(): void {
    this.background.run("Reprocessing stalled images", () => this.run());
  }

  async run(): Promise<void> {
    if (this.running || this.stopping) {
      return;
    }
    this.running = true;
    try {
      const { processed, skipped, failures } = await this.reprocessStaleImages.execute(
        () => this.stopping,
      );
      if (processed + skipped + failures.length > 0) {
        this.logger.log(
          `Stalled images: ${processed} processed, ${skipped} skipped, ${failures.length} failed`,
        );
      }
      for (const { imageId, cause } of failures) {
        // A single text, so the logger never takes the details for its context.
        this.logger.error(`Processing stalled image ${imageId} failed\n${stackWithCauses(cause)}`);
      }
    } catch (error) {
      this.logger.error(`Reprocessing stalled images failed\n${stackWithCauses(error)}`);
    } finally {
      this.running = false;
    }
  }
}
