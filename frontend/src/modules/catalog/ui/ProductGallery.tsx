"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/modules/core/lib/utils";

import { productDetailContent } from "../content/product-detail";
import type { ProductDetailImage } from "../domain/product-detail";

interface ProductGalleryProps {
  images: ProductDetailImage[];
}

const MAIN_SIZES = "(min-width: 861px) 45vw, 100vw";

/** The product's photos: the chosen one large and, with more than one, a thumbnail for each. */
export const ProductGallery = ({ images }: ProductGalleryProps) => {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-4/5 overflow-hidden rounded-card border border-line-soft bg-wheat">
        <Image
          // A new key per photo, so the page never shows the previous one while the next loads.
          key={current.id}
          src={current.url}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes={MAIN_SIZES}
          unoptimized={!current.optimizable}
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="flex flex-wrap gap-2.5">
          {images.map((image, position) => (
            <li key={image.id}>
              <button
                type="button"
                aria-label={productDetailContent.gallery.photo(position + 1, images.length)}
                aria-current={image.id === current.id ? "true" : undefined}
                onClick={() => setIndex(position)}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-xl border-2 bg-wheat transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  image.id === current.id ? "border-teal" : "border-line-soft hover:border-line",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="64px"
                  unoptimized={!image.optimizable}
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
