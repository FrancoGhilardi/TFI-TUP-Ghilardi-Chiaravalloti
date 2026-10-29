import type { Clock } from "../../../../shared/application/clock.js";
import { type Page, pageOf } from "../../../../shared/application/pagination.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import type { SearchCatalogQuery } from "../dto/search-catalog.query.js";
import type { CatalogQueries } from "../ports/catalog-queries.js";
import { searchWordsOf } from "../services/search-words.js";
import type { CatalogSettings } from "../settings/catalog-settings.js";

/**
 * A page of the products the store shows, optionally within a category and its subcategories,
 * and with a text found as the search box finds it, in the store order.
 */
export class SearchCatalogUseCase implements UseCase<SearchCatalogQuery, Page<ProductCardResult>> {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly settings: CatalogSettings,
    private readonly clock: Clock,
  ) {}

  async execute(query: SearchCatalogQuery): Promise<Page<ProductCardResult>> {
    const { q, ...page } = query;
    if (q === undefined) {
      return this.queries.findPage(page, this.clock.now());
    }
    const { words } = searchWordsOf(q, this.settings);
    // A text of one-letter words looks for nothing, so it finds nothing.
    if (words.length === 0) {
      return pageOf([], 0, query);
    }
    return this.queries.findPage({ ...page, words }, this.clock.now());
  }
}
