import { libreria } from "./libreria.schema.js";

export const productSkuSeq = libreria.sequence("product_sku_seq", {
  startWith: 1,
  increment: 1,
});
