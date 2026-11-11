import { Controller, useFormContext } from "react-hook-form";

import { SelectField } from "@/modules/core/ui/SelectField";
import { Button } from "@/modules/core/ui/primitives/button";

import { useCategoryOptions } from "../application/useCategoryOptions";
import { categoryFormText } from "../content/categories";
import type { CategoryFormValues } from "../domain/category-form";
import { selectableParents } from "../domain/category-tree";

interface ParentFieldProps {
  /** The category being edited; absent when creating, which can go under any category. */
  categoryId?: string;
}

/**
 * Where the category goes in the tree. It never offers the category itself nor anything below it,
 * which would close a cycle; while the categories are not there it cannot be changed, so that a
 * list that has not loaded is not taken for "no parent".
 */
export const ParentField = ({ categoryId }: ParentFieldProps) => {
  const { control, formState } = useFormContext<CategoryFormValues>();
  const options = useCategoryOptions();
  const { parent } = categoryFormText.fields;

  return (
    <Controller
      control={control}
      name="parentId"
      render={({ field }) => {
        const choices = options.data
          ? selectableParents(options.data, categoryId).map(({ id, label }) => ({
              value: id,
              label,
            }))
          : [];
        // The current parent can be missing from the list (it was deleted meanwhile): it stays
        // shown, so that saving something else does not quietly move the category.
        if (field.value && !choices.some(({ value }) => value === field.value)) {
          choices.unshift({ value: field.value, label: parent.current });
        }
        const loading = options.isPending;
        const failed = options.isError && !options.data;

        return (
          <div className="flex flex-col gap-2">
            <SelectField
              id="category-parent"
              label={parent.label}
              ref={field.ref}
              name={field.name}
              value={field.value}
              disabled={loading || failed}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
              options={[{ value: "", label: parent.root }, ...choices]}
              hint={loading ? parent.loading : categoryId ? parent.hintEdit : parent.hintNew}
              error={formState.errors.parentId?.message}
            />
            {failed && (
              <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
                <span>{parent.failed}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void options.refetch()}
                >
                  {parent.retry}
                </Button>
              </div>
            )}
          </div>
        );
      }}
    />
  );
};
