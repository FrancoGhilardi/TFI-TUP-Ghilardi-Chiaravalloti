import { useFormContext } from "react-hook-form";

import { TextAreaField } from "@/modules/core/ui/TextAreaField";
import { TextField } from "@/modules/core/ui/TextField";

import { productFormText } from "../content/product-form";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "../content/product-form";
import type { ProductFormValues } from "../domain/product-form";
import { FormSection } from "@/modules/core/ui/FormSection";

interface DataSectionProps {
  editing: boolean;
}

export const DataSection = ({ editing }: DataSectionProps) => {
  const { register, formState } = useFormContext<ProductFormValues>();
  const { errors } = formState;
  const { title, description, price, stock } = productFormText.fields;

  return (
    <FormSection title={productFormText.sections.data}>
      <TextField
        id="product-title"
        label={title.label}
        placeholder={title.placeholder}
        maxLength={TITLE_MAX_LENGTH}
        hint={editing ? title.hintEdit : title.hintNew}
        error={errors.title?.message}
        {...register("title")}
      />
      <TextAreaField
        id="product-description"
        label={description.label}
        note={description.note}
        placeholder={description.placeholder}
        maxLength={DESCRIPTION_MAX_LENGTH}
        error={errors.description?.message}
        {...register("description")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="product-price"
          label={price.label}
          placeholder={price.placeholder}
          inputMode="decimal"
          error={errors.price?.message}
          {...register("price")}
        />
        <TextField
          id="product-stock"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          label={stock.label}
          placeholder={stock.placeholder}
          error={errors.stock?.message}
          {...register("stock")}
        />
      </div>
    </FormSection>
  );
};
