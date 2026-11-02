import { NEW_ARRIVALS_CATALOG_HREF } from "@/modules/catalog";

import { getHomeNewArrivals } from "../application/get-home-content";
import { ProductShowcase } from "./ProductShowcase";

export const NewArrivalsSection = async () => {
  return (
    <ProductShowcase
      id="novedades"
      eyebrow="Recién llegados"
      title="Novedades"
      more={{ href: NEW_ARRIVALS_CATALOG_HREF, label: "Ver todas las novedades" }}
      products={await getHomeNewArrivals()}
    />
  );
};
