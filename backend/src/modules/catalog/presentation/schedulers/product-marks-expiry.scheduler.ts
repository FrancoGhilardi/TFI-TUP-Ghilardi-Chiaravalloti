import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { stackWithCauses } from "../../../../shared/application/error-stack.js";
import { ExpireProductMarksUseCase } from "../../application/use-cases/expire-product-marks.use-case.js";

/** The job's name in the scheduler registry. */
export const PRODUCT_MARKS_EXPIRY_JOB = "product-marks-expiry";

/**
 * Every day at midnight in Argentina, clears the sales and "new" marks that ended. The store
 * already stops showing them at their end date; this keeps the stored data, and what the panel
 * shows, in line with it.
 */
@Injectable()
export class ProductMarksExpiryScheduler {
  private readonly logger = new Logger(ProductMarksExpiryScheduler.name);

  constructor(private readonly expireProductMarks: ExpireProductMarksUseCase) {}

  @Cron("0 0 * * *", {
    name: PRODUCT_MARKS_EXPIRY_JOB,
    timeZone: "America/Argentina/Buenos_Aires",
  })
  async run(): Promise<void> {
    try {
      const { sales, newMarks } = await this.expireProductMarks.execute();
      this.logger.log(`Cleared ${sales} ended sales and ${newMarks} ended new marks`);
    } catch (error) {
      // A single text, so the logger never takes the details for its context.
      this.logger.error(`Clearing ended sales and new marks failed\n${stackWithCauses(error)}`);
    }
  }
}
