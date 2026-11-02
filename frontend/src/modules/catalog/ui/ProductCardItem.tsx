import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ProductCard } from "../domain/product-card";
import { productHref } from "../domain/product-routes";
import { ProductBadges } from "./ProductBadges";
import { ProductPrice } from "./ProductPrice";

/** Image width per grid column: 2 columns on phones, 3 on tablets, 5 on desktop. */
const IMAGE_SIZES = "(min-width: 1024px) 236px, (min-width: 681px) 33vw, 50vw";

interface ProductCardItemProps {
  product: ProductCard;
  /** Control below the price, such as "Agregar"; it stays clickable over the card link. */
  action?: ReactNode;
}

export const ProductCardItem = ({ product, action }: ProductCardItemProps) => {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line-soft bg-surface transition focus-within:border-line hover:-translate-y-1 hover:border-line hover:shadow-raised">
      <div className="relative aspect-4/5 bg-wheat">
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          sizes={IMAGE_SIZES}
          // An image from another host skips the optimizer instead of breaking the page.
          unoptimized={!product.image.optimizable}
          className="object-cover"
        />
        <ProductBadges {...product} />
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        {product.category && (
          <p className="text-[0.72rem] font-semibold tracking-[0.06em] text-teal uppercase">
            {product.category.name}
          </p>
        )}
        <h3 className="mt-1 font-serif text-base leading-tight font-semibold text-ink">
          {/* The link covers the whole card, so the card has one link named by the title. */}
          <Link
            href={productHref(product.slug)}
            className="rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {product.title}
          </Link>
        </h3>
        <div className="mt-auto pt-3">
          <ProductPrice {...product} />
        </div>
        {action && <div className="relative z-10 mt-3">{action}</div>}
      </div>
    </article>
  );
};
