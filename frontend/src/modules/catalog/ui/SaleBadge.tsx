import { productDetailContent } from "../content/product-detail";
import { badgeStyles } from "./product-badge-styles";

/** "Oferta" label for a product whose sale is running. */
export const SaleBadge = () => {
  return <span className={badgeStyles({ kind: "sale" })}>{productDetailContent.price.sale}</span>;
};
