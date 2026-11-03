import Image from "next/image";
import Link from "next/link";

import { whenPlainClick } from "@/modules/core/lib/events";

import type { ProductCard } from "../domain/product-card";
import { productHref } from "../domain/product-routes";
import { ProductPrice } from "./ProductPrice";
import { searchRowStyles } from "./searchResultStyles";

interface SearchProductItemProps {
  product: ProductCard;
  onNavigate: () => void;
}

export const SearchProductItem = ({ product, onNavigate }: SearchProductItemProps) => {
  return (
    <Link
      href={productHref(product.slug)}
      onClick={whenPlainClick(onNavigate)}
      className={searchRowStyles}
    >
      <span className="relative aspect-4/5 w-11 shrink-0 overflow-hidden rounded-md bg-wheat">
        <Image
          src={product.image.url}
          alt=""
          fill
          sizes="44px"
          unoptimized={!product.image.optimizable}
          className="object-cover"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2">{product.title}</span>
        <ProductPrice {...product} />
      </span>
    </Link>
  );
};
