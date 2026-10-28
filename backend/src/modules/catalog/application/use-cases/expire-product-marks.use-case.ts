import type { Clock } from "../../../../shared/application/clock.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import type { ExpiredMarksResult } from "../dto/expired-marks.result.js";

/**
 * Clears the sales and "new" marks that already ended, so the stored data matches what the
 * store shows. Safe to run any number of times: what is cleared is not found again.
 */
export class ExpireProductMarksUseCase implements UseCase<void, ExpiredMarksResult> {
  constructor(
    private readonly products: ProductRepository,
    private readonly clock: Clock,
  ) {}

  execute(): Promise<ExpiredMarksResult> {
    return this.products.clearExpiredMarks(this.clock.now());
  }
}
