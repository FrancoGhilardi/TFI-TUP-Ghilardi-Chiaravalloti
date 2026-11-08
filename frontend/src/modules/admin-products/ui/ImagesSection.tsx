import { useFormContext, useWatch } from "react-hook-form";

import { productFormText, productImagesText } from "../content/product-form";
import { MAX_IMAGES } from "../domain/image-rules";
import type { ProductFormValues } from "../domain/product-form";
import { FormSection } from "./FormSection";
import { NewImagesField } from "./NewImagesField";

/** The images of the product: chosen here when it is being created. */
export const ImagesSection = () => {
  const { control } = useFormContext<ProductFormValues>();
  const chosen = useWatch({ control, name: "images" });
  const { help, count } = productImagesText;

  return (
    <FormSection title={productFormText.sections.images} note={count(chosen.length, MAX_IMAGES)}>
      <p className="text-sm text-ink-soft">{help}</p>
      <NewImagesField />
    </FormSection>
  );
};
