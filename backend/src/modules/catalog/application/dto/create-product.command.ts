/** One of the images of a new product, in the order the panel shows them. */
export interface ImageUploadInput {
  /** The file as received; its format is read from its first bytes. */
  bytes: Uint8Array;
  altText?: string;
}

/** A new product with its first images; the system generates its SKU and slug. */
export interface CreateProductCommand {
  /** The panel user creating it. */
  actorId: string;
  title: string;
  description?: string;
  /** Decimal text, such as "1500.50", so no cent is lost on the way. */
  price: string;
  /** Present only when the product starts on sale. */
  sale?: { price: string; endsAt?: Date };
  stock: number;
  isFeatured: boolean;
  /** Present only when the product starts marked as new. */
  newMark?: { until?: Date };
  sortOrder?: number;
  isActive: boolean;
  categoryIds: string[];
  primaryCategoryId: string;
  relatedProductIds?: string[];
  images: ImageUploadInput[];
}
