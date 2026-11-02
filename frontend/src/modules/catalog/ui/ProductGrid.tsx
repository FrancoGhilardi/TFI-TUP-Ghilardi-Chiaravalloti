import type { ReactNode } from "react";

import type { ProductCard } from "../domain/product-card";
import { ProductCardItem } from "./ProductCardItem";

interface ProductGridProps {
  products: ProductCard[];
  /** Control for each card, such as "Agregar". */
  renderAction?: (product: ProductCard) => ReactNode;
}

export const ProductGrid = ({ products, renderAction }: ProductGridProps) => {
  return (
    <ul className="grid grid-cols-2 gap-3.5 min-[681px]:grid-cols-3 min-[681px]:gap-5 lg:grid-cols-5">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCardItem product={product} action={renderAction?.(product)} />
        </li>
      ))}
    </ul>
  );
};
