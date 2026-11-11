import { Controller, useFormContext } from "react-hook-form";

import { FormSection } from "@/modules/core/ui/FormSection";
import { StateRadioField } from "@/modules/core/ui/StateRadioField";
import { TextAreaField } from "@/modules/core/ui/TextAreaField";
import { TextField } from "@/modules/core/ui/TextField";

import { categoryFormText, DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from "../content/categories";
import type { CategoryFormValues } from "../domain/category-form";
import { ParentField } from "./ParentField";

interface CategoryDataSectionProps {
  /** The category being edited; absent when creating. */
  categoryId?: string;
}

export const CategoryDataSection = ({ categoryId }: CategoryDataSectionProps) => {
  const { control, register, formState } = useFormContext<CategoryFormValues>();
  const { errors } = formState;
  const { sections, fields, state } = categoryFormText;
  const editing = categoryId !== undefined;

  return (
    <>
      <FormSection title={sections.data}>
        <TextField
          id="category-name"
          label={fields.name.label}
          placeholder={fields.name.placeholder}
          maxLength={NAME_MAX_LENGTH}
          hint={editing ? fields.name.hintEdit : fields.name.hintNew}
          error={errors.name?.message}
          {...register("name")}
        />
        <TextAreaField
          id="category-description"
          label={fields.description.label}
          note={fields.description.note}
          placeholder={fields.description.placeholder}
          maxLength={DESCRIPTION_MAX_LENGTH}
          error={errors.description?.message}
          {...register("description")}
        />
        <ParentField categoryId={categoryId} />
      </FormSection>
      <FormSection title={sections.publication}>
        <TextField
          id="category-sort-order"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          label={fields.sortOrder.label}
          hint={fields.sortOrder.hint}
          error={errors.sortOrder?.message}
          {...register("sortOrder")}
        />
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <StateRadioField
              id="category-state"
              label={state.label}
              activeLabel={state.active}
              inactiveLabel={state.inactive}
              hint={state.hint}
              active={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormSection>
    </>
  );
};
