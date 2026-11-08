import { useFormContext } from "react-hook-form";

import { TextField } from "@/modules/core/ui/TextField";

import { productFormText } from "../content/product-form";
import type { ProductFormValues } from "../domain/product-form";

/** The day the novelty ends, shown while the mark is on. */
export const NewMarkFields = () => {
  const { register, formState } = useFormContext<ProductFormValues>();
  const { new: mark, optional } = productFormText.publication;

  return (
    <TextField
      id="product-new-until"
      type="date"
      label={`${mark.until} ${optional}`}
      hint={mark.untilHint}
      error={formState.errors.newUntil?.message}
      {...register("newUntil")}
    />
  );
};
