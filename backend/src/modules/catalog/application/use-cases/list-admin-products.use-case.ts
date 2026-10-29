import type { Clock } from "../../../../shared/application/clock.js";
import type { Page } from "../../../../shared/application/pagination.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { AdminProductListItemResult } from "../dto/admin-product-list-item.result.js";
import type { ListAdminProductsQuery } from "../dto/list-admin-products.query.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";

/** A page of the products the admin panel lists, with the sales and marks running now. */
export class ListAdminProductsUseCase implements UseCase<
  ListAdminProductsQuery,
  Page<AdminProductListItemResult>
> {
  constructor(
    private readonly queries: AdminProductQueries,
    private readonly clock: Clock,
  ) {}

  execute(query: ListAdminProductsQuery): Promise<Page<AdminProductListItemResult>> {
    return this.queries.findPage(query, this.clock.now());
  }
}
