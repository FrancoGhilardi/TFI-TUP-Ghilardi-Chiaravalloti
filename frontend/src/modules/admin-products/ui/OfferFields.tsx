import { useFormContext, useWatch } from "react-hook-form";

import { TextField } from "@/modules/core/ui/TextField";

import { productFormText } from "../content/product-form";
import { discountPercent } from "../domain/price-input";
import type { ProductFormValues } from "../domain/product-form";

/** The offer price and its end, shown while the offer is on. */
export const OfferFields = () => {
  const { register, formState, control } = useFormContext<ProductFormValues>();
  const [price, salePrice] = useWatch({ control, name: ["price", "salePrice"] });
  const { sale, optional } = productFormText.publication;
  const percent = discountPercent(price, salePrice);

  return (
    <>
      <TextField
        id="product-sale-price"
        label={sale.price}
        placeholder={sale.pricePlaceholder}
        inputMode="decimal"
        hint={percent === undefined ? undefined : sale.discount(percent)}
        error={formState.errors.salePrice?.message}
        {...register("salePrice")}
      />
      <TextField
        id="product-sale-ends"
        type="date"
        label={`${sale.ends} ${optional}`}
        hint={sale.endsHint}
        error={formState.errors.saleEndsAt?.message}
        {...register("saleEndsAt")}
      />
    </>
  );
};
