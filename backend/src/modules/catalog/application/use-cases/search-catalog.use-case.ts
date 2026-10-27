import type { Clock } from "../../../../shared/application/clock.js";
import type { Page } from "../../../../shared/application/pagination.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import type { SearchCatalogQuery } from "../dto/search-catalog.query.js";
import type { CatalogQueries } from "../ports/catalog-queries.js";

/** A page of the products the store shows, optionally within a category and its subcategories. */
export class SearchCatalogUseCase implements UseCase<SearchCatalogQuery, Page<ProductCardResult>> {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly clock: Clock,
  ) {}

  execute(query: SearchCatalogQuery): Promise<Page<ProductCardResult>> {
    return this.queries.findPage(query, this.clock.now());
  }
}
