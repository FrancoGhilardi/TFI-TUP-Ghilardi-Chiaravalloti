import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

import type { ProductCard } from "../domain/product-card";
import { PRODUCT_GRID_LAYOUTS, type ProductGridLayout } from "./product-grid-layouts";
import { ProductCardItem } from "./ProductCardItem";

interface ProductGridProps {
  products: ProductCard[];
  layout: ProductGridLayout;
  /** Control for each card, such as "Agregar". */
  renderAction?: (product: ProductCard) => ReactNode;
}

export const ProductGrid = ({ products, layout, renderAction }: ProductGridProps) => {
  const { columns, imageSizes } = PRODUCT_GRID_LAYOUTS[layout];
  return (
    <ul className={cn("grid gap-3.5 min-[681px]:gap-5", columns)}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCardItem
            product={product}
            imageSizes={imageSizes}
            action={renderAction?.(product)}
          />
        </li>
      ))}
    </ul>
  );
};
