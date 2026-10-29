import type { UseCase } from "../../../../shared/application/use-case.js";
import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import { detailOf } from "../services/product-loading.js";

/** A product as the panel form shows it, deleted or not, with its images and their state. */
export class GetAdminProductUseCase implements UseCase<string, AdminProductDetailResult> {
  constructor(private readonly queries: AdminProductQueries) {}

  execute(productId: string): Promise<AdminProductDetailResult> {
    return detailOf(this.queries, productId);
  }
}
