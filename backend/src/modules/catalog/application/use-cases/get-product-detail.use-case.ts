import type { Clock } from "../../../../shared/application/clock.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { InvalidSlugError } from "../../../../shared/domain/errors/invalid-slug-error.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import type { ProductDetailResult } from "../dto/product-detail.result.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import type { CatalogQueries } from "../ports/catalog-queries.js";
import type { CatalogSettings } from "../settings/catalog-settings.js";

/**
 * The page of a visible product, with its related products: those set by hand first and, when
 * they are not enough, others with the same primary category, if the store shows it.
 */
export class GetProductDetailUseCase implements UseCase<string, ProductDetailResult> {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly settings: CatalogSettings,
    private readonly clock: Clock,
  ) {}

  async execute(slug: string): Promise<ProductDetailResult> {
    // A text no slug can have names no product; it never reaches the database.
    if (!isSlug(slug)) {
      throw new ProductNotFoundError();
    }
    const now = this.clock.now();
    const page = await this.queries.findPageBySlug(slug, now);
    if (!page) {
      throw new ProductNotFoundError();
    }

    const limit = this.settings.relatedLimit;
    const related = await this.queries.findManualRelated(page.id, limit, now);
    // Only from a primary category the store shows; a hidden one groups nothing.
    if (related.length < limit && page.primaryCategory) {
      related.push(
        ...(await this.queries.findByPrimaryCategory(
          page.primaryCategory.id,
          [page.id, ...related.map((card) => card.id)],
          limit - related.length,
          now,
        )),
      );
    }
    return { ...page, relatedProducts: related };
  }
}

function isSlug(text: string): boolean {
  try {
    Slug.fromValue(text);
    return true;
  } catch (error) {
    if (error instanceof InvalidSlugError) {
      return false;
    }
    throw error;
  }
}
