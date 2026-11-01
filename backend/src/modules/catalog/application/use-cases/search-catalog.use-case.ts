import type { Clock } from "../../../../shared/application/clock.js";
import { type Page, pageOf } from "../../../../shared/application/pagination.js";
import { Money } from "../../../../shared/domain/value-objects/money.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { ProductCardResult } from "../dto/product-card.result.js";
import type { CatalogPageQuery } from "../dto/catalog-page.query.js";
import { ProductSort, type SearchCatalogQuery } from "../dto/search-catalog.query.js";
import { InvalidPriceRangeError } from "../errors/invalid-price-range-error.js";
import type { CatalogQueries } from "../ports/catalog-queries.js";
import { searchWordsOf } from "../services/search-words.js";
import type { CatalogSettings } from "../settings/catalog-settings.js";

/**
 * A page of the products the store shows, filtered and sorted as asked; a highest price below
 * the lowest one is refused, whoever asks. By default, with a
 * text found as the search box finds it, the titles that start with it first, then the store
 * order.
 */
export class SearchCatalogUseCase implements UseCase<SearchCatalogQuery, Page<ProductCardResult>> {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly settings: CatalogSettings,
    private readonly clock: Clock,
  ) {}

  async execute(query: SearchCatalogQuery): Promise<Page<ProductCardResult>> {
    const { q, minPrice, maxPrice, sort = ProductSort.RELEVANCE, ...rest } = query;
    const page: CatalogPageQuery = {
      ...rest,
      sort,
      minPrice: minPrice === undefined ? undefined : Money.fromDecimal(minPrice),
      maxPrice: maxPrice === undefined ? undefined : Money.fromDecimal(maxPrice),
    };
    if (page.minPrice && page.maxPrice?.isLessThan(page.minPrice)) {
      throw new InvalidPriceRangeError();
    }
    if (q === undefined) {
      return this.queries.findPage(page, this.clock.now());
    }
    const { words, text } = searchWordsOf(q, this.settings);
    // A text of one-letter words looks for nothing, so it finds nothing.
    if (words.length === 0) {
      return pageOf([], 0, query);
    }
    return this.queries.findPage({ ...page, words, text }, this.clock.now());
  }
}
