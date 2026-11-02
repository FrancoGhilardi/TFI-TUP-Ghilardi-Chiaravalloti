/** The few fields that name a category, such as the parent of another one. */
export interface CategorySummaryResult {
  id: string;
  name: string;
  slug: string;
}

/**
 * A category as the admin panel shows it. What it does not have is `null`, so the shape never
 * changes. `depth` is 0 for a root, and `productCount` counts the current products that have
 * it among their categories.
 */
export interface AdminCategoryResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent: CategorySummaryResult | null;
  sortOrder: number;
  isActive: boolean;
  depth: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
