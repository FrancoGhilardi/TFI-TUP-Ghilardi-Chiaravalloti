import type { UseCase } from "../../../../shared/application/use-case.js";
import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { imageResultsOf } from "../services/image-loading.js";

/**
 * A product's images by position, with their state, deleted product or not; the panel reads it
 * again and again while some are being processed.
 */
export class ListProductImagesUseCase implements UseCase<string, AdminProductImageResult[]> {
  constructor(private readonly queries: AdminProductQueries) {}

  execute(productId: string): Promise<AdminProductImageResult[]> {
    return imageResultsOf(this.queries, productId);
  }
}
