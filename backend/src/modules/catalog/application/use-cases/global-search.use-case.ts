import type { Clock } from "../../../../shared/application/clock.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { GlobalSearchQuery } from "../dto/global-search.query.js";
import type { GlobalSearchResult } from "../dto/global-search.result.js";
import type { CatalogQueries } from "../ports/catalog-queries.js";
import type { CategoryQueries } from "../ports/category-queries.js";
import { searchWordsOf } from "../services/search-words.js";
import type { CatalogSettings } from "../settings/catalog-settings.js";

/**
 * The store search box: visible products by title and visible categories by name, where every
 * word of the text appears in any order (`searchWordsOf`). Those starting with the whole text
 * come first.
 */
export class GlobalSearchUseCase implements UseCase<GlobalSearchQuery, GlobalSearchResult> {
  constructor(
    private readonly catalog: CatalogQueries,
    private readonly categories: CategoryQueries,
    private readonly settings: CatalogSettings,
    private readonly clock: Clock,
  ) {}

  async execute(query: GlobalSearchQuery): Promise<GlobalSearchResult> {
    const { words, text } = searchWordsOf(query.q, this.settings);
    if (words.length === 0) {
      return { products: [], categories: [] };
    }
    const [products, categories] = await Promise.all([
      this.catalog.searchCards(words, text, query.limit, this.clock.now()),
      this.categories.searchVisible(words, text, query.limit),
    ]);
    return { products, categories };
  }
}
