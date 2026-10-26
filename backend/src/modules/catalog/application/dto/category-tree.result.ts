/** A category of the store menu, with the visible subcategories under it. */
export interface CategoryTreeResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: CategoryTreeResult[];
}
