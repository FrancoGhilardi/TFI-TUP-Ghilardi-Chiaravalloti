import { allCategories } from "../domain/category";
import { categoryHref } from "../domain/catalog-query";
import { productHref } from "../domain/product-routes";
import { getCategoryTree } from "../infrastructure/categories-api";
import { getAllProductSlugs } from "../infrastructure/products-api";

export interface CatalogSitemapPaths {
  categoryPaths: string[];
  productPaths: string[];
}

/**
 * The public path of every category and product in the store. A failure of the API is thrown:
 * a sitemap without products would be read as if they were gone.
 */
export async function getCatalogSitemapPaths(): Promise<CatalogSitemapPaths> {
  const [tree, slugs] = await Promise.all([getCategoryTree(), getAllProductSlugs()]);
  return {
    categoryPaths: allCategories(tree).map((category) => categoryHref(category.slug)),
    productPaths: slugs.map(productHref),
  };
}
