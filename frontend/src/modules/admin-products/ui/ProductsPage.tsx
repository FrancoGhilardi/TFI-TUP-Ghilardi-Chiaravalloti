"use client";

import { ListPage } from "@/modules/core/ui/ListPage";

import { useProductsQuery } from "../application/useProductsQuery";
import { productsContent } from "../content/products";
import { PRODUCTS_PATH } from "../domain/products-query";
import { ProductsResults } from "./ProductsResults";
import { ProductsToolbar } from "./ProductsToolbar";

/** The panel's list of products: search, filters, sort, pages and the logical delete. */
export const ProductsPage = () => {
  const { query, go } = useProductsQuery();
  const { eyebrow, title, lead, newProduct } = productsContent;

  return (
    <ListPage
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      create={{ label: newProduct, href: `${PRODUCTS_PATH}/nuevo` }}
    >
      <ProductsToolbar query={query} go={go} />
      <ProductsResults query={query} go={go} />
    </ListPage>
  );
};
