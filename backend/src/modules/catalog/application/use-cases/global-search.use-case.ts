import type { Clock } from "../../../../shared/application/clock.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { GlobalSearchQuery } from "../dto/global-search.query.js";
import type { GlobalSearchResult } from "../dto/global-search.result.js";
import type { CatalogQueries } from "../ports/catalog-queries.js";
import type { CategoryQueries } from "../ports/category-queries.js";
import type { CatalogSettings } from "../settings/catalog-settings.js";

// The same word whatever its case and accents, as the queries compare it.
const keyOf = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * The store search box: visible products by title and visible categories by name, where every
 * word of the text appears in any order. Those starting with the whole text come first. Each
 * word costs a pass over the titles, so one-letter words, which match almost everything, are
 * left out, and only the first few distinct words are looked for.
 */
export class GlobalSearchUseCase implements UseCase<GlobalSearchQuery, GlobalSearchResult> {
  constructor(
    private readonly catalog: CatalogQueries,
    private readonly categories: CategoryQueries,
    private readonly settings: CatalogSettings,
    private readonly clock: Clock,
  ) {}

  async execute(query: GlobalSearchQuery): Promise<GlobalSearchResult> {
    const all = query.q.split(/\s+/).filter((word) => word !== "");
    // A single space between words, so a doubled one does not stop a match at the start.
    const text = all.join(" ");
    const words = this.wordsToFind(all);
    if (words.length === 0) {
      return { products: [], categories: [] };
    }
    const [products, categories] = await Promise.all([
      this.catalog.searchCards(words, text, query.limit, this.clock.now()),
      this.categories.searchVisible(words, text, query.limit),
    ]);
    return { products, categories };
  }

  private wordsToFind(all: readonly string[]): string[] {
    const byKey = new Map<string, string>();
    for (const word of all) {
      const key = keyOf(word);
      if ([...key].length >= this.settings.searchMinWordLength && !byKey.has(key)) {
        byKey.set(key, word);
      }
    }
    return [...byKey.values()].slice(0, this.settings.searchMaxWords);
  }
}
