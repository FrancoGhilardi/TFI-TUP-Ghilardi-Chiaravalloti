"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/modules/core/lib/utils";

import { productDetailContent } from "../content/product-detail";
import type { ProductDetailImage } from "../domain/product-detail";
import { GALLERY_WIDTH } from "./gallery-width";

interface ProductGalleryProps {
  images: ProductDetailImage[];
}

// Over the photo, light enough to see through: 44px to be easy to hit with a finger.
const ARROW =
  "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/65 text-ink shadow-soft backdrop-blur-sm transition-colors outline-none hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-ring/50";

const MAIN_SIZES = "(min-width: 861px) 32rem, min(20rem, 100vw)";

/** The product's photos: the chosen one large and, with more than one, a thumbnail for each. */
export const ProductGallery = ({ images }: ProductGalleryProps) => {
  const [index, setIndex] = useState(0);
  const position = Math.min(index, images.length - 1);
  const current = images[position];
  const { gallery } = productDetailContent;
  // Round the ends: after the last photo comes the first one again.
  const step = (by: number) =>
    setIndex((now) => (Math.min(now, images.length - 1) + by + images.length) % images.length);

  return (
    <div className={cn("flex flex-col gap-3", GALLERY_WIDTH)}>
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
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label={gallery.previous}
              onClick={() => step(-1)}
              className={cn(ARROW, "left-2.5")}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={gallery.next}
              onClick={() => step(1)}
              className={cn(ARROW, "right-2.5")}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <p role="status" className="sr-only">
          {gallery.shown(position + 1, images.length)}
        </p>
      )}
      {images.length > 1 && (
        <ul className="flex flex-wrap gap-2.5">
          {images.map((image, place) => (
            <li key={image.id}>
              <button
                type="button"
                aria-label={gallery.photo(place + 1, images.length)}
                aria-current={image.id === current.id ? "true" : undefined}
                onClick={() => setIndex(place)}
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
