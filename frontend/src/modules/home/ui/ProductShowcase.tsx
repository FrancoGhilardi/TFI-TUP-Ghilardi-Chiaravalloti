import type { ReactNode } from "react";

import { type ProductCard, ProductGrid } from "@/modules/catalog";
import { SectionHeading } from "@/modules/core/ui/SectionHeading";

interface ProductShowcaseProps {
  id: string;
  eyebrow: ReactNode;
  title: string;
  more: { href: string; label: string };
  products: ProductCard[];
}

/** A titled row of products; nothing at all when there are none to show. */
export const ProductShowcase = ({ id, eyebrow, title, more, products }: ProductShowcaseProps) => {
  if (products.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={id}>
      <SectionHeading id={id} eyebrow={eyebrow} title={title} more={more} />
      <ProductGrid products={products} />
    </section>
  );
};
