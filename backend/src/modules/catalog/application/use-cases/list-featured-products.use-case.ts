import type { Clock } from "../../../../shared/application/clock.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import type { CatalogQueries } from "../ports/catalog-queries.js";
import type { CatalogSettings } from "../settings/catalog-settings.js";

/** The featured products of the home page, in the store order. */
export class ListFeaturedProductsUseCase implements UseCase<void, ProductCardResult[]> {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly settings: CatalogSettings,
    private readonly clock: Clock,
  ) {}

  execute(): Promise<ProductCardResult[]> {
    return this.queries.findFeatured(this.settings.highlightsLimit, this.clock.now());
  }
}
