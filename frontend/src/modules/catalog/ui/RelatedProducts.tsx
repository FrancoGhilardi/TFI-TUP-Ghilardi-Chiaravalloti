import { SectionHeading } from "@/modules/core/ui/SectionHeading";

import { productDetailContent } from "../content/product-detail";
import type { ProductCard } from "../domain/product-card";
import { ProductGrid } from "./ProductGrid";

const HEADING_ID = "productos-similares";

interface RelatedProductsProps {
  products: ProductCard[];
}

/** Other products the visitor may like; nothing at all when there are none. */
export const RelatedProducts = ({ products }: RelatedProductsProps) => {
  if (products.length === 0) {
    return null;
  }
  const { eyebrow, title } = productDetailContent.related;
  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionHeading id={HEADING_ID} eyebrow={eyebrow} title={title} />
      <ProductGrid products={products} layout="related" />
    </section>
  );
};
