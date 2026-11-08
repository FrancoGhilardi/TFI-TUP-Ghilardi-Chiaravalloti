/** What the panel's lists show of a product. */
export interface AdminProductSummary {
  id: string;
  sku: string;
  title: string;
  stock: number;
  isActive: boolean;
  /** Address of the first image, or `null` while it has none ready. */
  thumbnailUrl: string | null;
  updatedAt: Date;
}

/** A product at or below this stock is running out. */
export const LOW_STOCK_MAX = 5;
