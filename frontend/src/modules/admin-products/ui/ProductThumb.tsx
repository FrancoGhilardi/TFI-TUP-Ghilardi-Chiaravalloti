import { Package } from "lucide-react";
import Image from "next/image";

import { publicConfig } from "@/modules/core/config/env";
import { isOptimizableImage } from "@/modules/core/config/images";

interface ProductThumbProps {
  url: string | null;
}

/** The small picture of a product in a list; a box with an icon while it has none. */
export const ProductThumb = ({ url }: ProductThumbProps) => {
  return (
    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-wheat text-ink-soft">
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes="44px"
          unoptimized={!isOptimizableImage(url, publicConfig.storageOrigin)}
          className="object-cover"
        />
      ) : (
        <Package className="size-5" aria-hidden="true" />
      )}
    </span>
  );
};
