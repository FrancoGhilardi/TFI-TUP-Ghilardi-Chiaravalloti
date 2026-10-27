/**
 * Changes to a product; only the fields present change. The slug, the SKU and the images
 * never change here.
 */
export interface UpdateProductCommand {
  productId: string;
  /** The panel user making the changes. */
  actorId: string;
  title?: string;
  /** Blank removes it. */
  description?: string;
  /** Decimal text, such as "1500.50". */
  price?: string;
  /** A value replaces the whole sale; `null` ends it. */
  sale?: { price: string; endsAt?: Date } | null;
  stock?: number;
  isFeatured?: boolean;
  /** A value replaces the whole mark; `null` removes it. */
  newMark?: { until?: Date } | null;
  sortOrder?: number;
  isActive?: boolean;
  /** Replaces every category of the product. */
  categories?: { ids: string[]; primaryId: string };
  /** Replaces every related product; empty removes them. */
  relatedProductIds?: string[];
}
