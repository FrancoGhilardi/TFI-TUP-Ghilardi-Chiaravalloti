import { useFormContext, useWatch } from "react-hook-form";

import { useCategoryOptions } from "@/modules/admin-categories";
import { Button } from "@/modules/core/ui/primitives/button";

import { productFormText, productPickersText } from "../content/product-form";
import { toggleCategory } from "../domain/category-selection";
import type { ProductFormValues } from "../domain/product-form";
import { CategoryPicker } from "./CategoryPicker";
import { ChosenCategories } from "./ChosenCategories";
import { FieldError } from "./FieldError";
import { FormSection } from "@/modules/core/ui/FormSection";

interface CategoriesSectionProps {
  /** Categories the product already has, which may be hidden ones the list does not carry. */
  known?: { id: string; name: string }[];
}

const ERROR_ID = "product-categories-error";

export const CategoriesSection = ({ known = [] }: CategoriesSectionProps) => {
  const { control, setValue, formState } = useFormContext<ProductFormValues>();
  const [categoryIds, primaryCategoryId] = useWatch({
    control,
    name: ["categoryIds", "primaryCategoryId"],
  });
  const options = useCategoryOptions();
  const { help, loading, failed, retry } = productPickersText.categories;

  const nameOf = (id: string) =>
    (options.data?.find((option) => option.id === id)?.label.trim() ??
      known.find((category) => category.id === id)?.name) ||
    id;

  const apply = (next: { categoryIds: string[]; primaryCategoryId: string }) => {
    const settings = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
    setValue("categoryIds", next.categoryIds, settings);
    setValue("primaryCategoryId", next.primaryCategoryId, settings);
  };

  const error = formState.errors.categoryIds;
  const message = error?.message ?? error?.root?.message;

  return (
    <FormSection title={productFormText.sections.categories} note={help}>
      {options.isPending && <p className="text-sm text-ink-soft">{loading}</p>}
      {options.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span>{failed}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void options.refetch()}>
            {retry}
          </Button>
        </div>
      )}
      {options.data && (
        <CategoryPicker
          options={options.data}
          chosen={categoryIds}
          onToggle={(id) => apply(toggleCategory({ categoryIds, primaryCategoryId }, id))}
          invalid={Boolean(message)}
          describedBy={message ? ERROR_ID : undefined}
        />
      )}
      <ChosenCategories
        categories={categoryIds.map((id) => ({ id, name: nameOf(id) }))}
        primaryId={primaryCategoryId}
        onPrimary={(id) => apply({ categoryIds, primaryCategoryId: id })}
        onRemove={(id) => apply(toggleCategory({ categoryIds, primaryCategoryId }, id))}
      />
      <FieldError id={ERROR_ID} message={message} />
    </FormSection>
  );
};
