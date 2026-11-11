import { Controller, useFormContext } from "react-hook-form";

import { FormSection } from "@/modules/core/ui/FormSection";
import { TextAreaField } from "@/modules/core/ui/TextAreaField";
import { TextField } from "@/modules/core/ui/TextField";
import { Label } from "@/modules/core/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/modules/core/ui/primitives/radio-group";

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
        <div className="flex flex-col gap-2">
          <span id="category-state-label" className="text-sm font-semibold text-ink">
            {state.label}
          </span>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <RadioGroup
                aria-labelledby="category-state-label"
                value={field.value ? "active" : "inactive"}
                onValueChange={(value) => field.onChange(value === "active")}
                className="grid-cols-2"
              >
                {[
                  { value: "active", label: state.active },
                  { value: "inactive", label: state.inactive },
                ].map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center gap-2 rounded-xl border-[1.5px] border-line px-3 py-2"
                  >
                    <RadioGroupItem value={option.value} id={`category-state-${option.value}`} />
                    <Label htmlFor={`category-state-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
          <p className="text-sm text-ink-soft">{state.hint}</p>
        </div>
      </FormSection>
    </>
  );
};
