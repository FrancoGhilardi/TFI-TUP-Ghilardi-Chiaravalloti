import { Sparkles } from "lucide-react";

import { FEATURED_CATALOG_HREF } from "@/modules/catalog";

import { getHomeFeatured } from "../application/get-home-content";
import { ProductShowcase } from "./ProductShowcase";

export const FeaturedSection = async () => {
  return (
    <ProductShowcase
      id="destacados"
      eyebrow={
        <>
          <Sparkles className="size-3.5" aria-hidden="true" />
          Selección de la semana
        </>
      }
      title="Destacados"
      more={{ href: FEATURED_CATALOG_HREF, label: "Ver todos los destacados" }}
      products={await getHomeFeatured()}
    />
  );
};
