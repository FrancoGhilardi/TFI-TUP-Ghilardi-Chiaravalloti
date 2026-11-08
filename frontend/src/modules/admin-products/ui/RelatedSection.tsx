import { useFormContext, useWatch } from "react-hook-form";

import { productFormText, productPickersText, RELATED_MAX } from "../content/product-form";
import { moveItem } from "../domain/image-rules";
import type { ProductFormValues, RelatedChoice } from "../domain/product-form";
import { ChosenRelated } from "./ChosenRelated";
import { FieldError } from "./FieldError";
import { FormSection } from "./FormSection";
import { RelatedPicker } from "./RelatedPicker";

interface RelatedSectionProps {
  /** The product being edited, which cannot be related to itself; absent when creating. */
  productId?: string;
}

const ERROR_ID = "product-related-error";

export const RelatedSection = ({ productId }: RelatedSectionProps) => {
  const { control, setValue, formState } = useFormContext<ProductFormValues>();
  const chosen = useWatch({ control, name: "relatedProducts" });
  const { intro, full, count } = productPickersText.related;

  const apply = (next: RelatedChoice[]) =>
    setValue("relatedProducts", next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

  const error = formState.errors.relatedProducts;
  const message = error?.message ?? error?.root?.message;
  const isFull = chosen.length >= RELATED_MAX;

  return (
    <FormSection title={productFormText.sections.related} note={count(chosen.length, RELATED_MAX)}>
      <p className="text-sm text-ink-soft">{intro}</p>
      <RelatedPicker
        excluded={[...(productId ? [productId] : []), ...chosen.map(({ id }) => id)]}
        onPick={(product) => apply([...chosen, product])}
        disabled={isFull}
        describedBy={message ? ERROR_ID : undefined}
      />
      {isFull && <p className="text-sm text-ink-soft">{full}</p>}
      <ChosenRelated
        products={chosen}
        onMove={(from, to) => apply(moveItem(chosen, from, to))}
        onRemove={(id) => apply(chosen.filter((product) => product.id !== id))}
      />
      <FieldError id={ERROR_ID} message={message} />
    </FormSection>
  );
};
