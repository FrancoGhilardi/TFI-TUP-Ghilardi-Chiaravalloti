"use client";

import { FormProvider } from "react-hook-form";

import { formatDate } from "@/modules/core/formatters/date-time";
import { cn } from "@/modules/core/lib/utils";
import { ArchivedNotice } from "@/modules/core/ui/ArchivedNotice";
import { FormAlert } from "@/modules/core/ui/FormAlert";
import { FormSaveBar } from "@/modules/core/ui/FormSaveBar";

import { useCategoryActions } from "../application/useCategoryActions";
import { useCategoryForm } from "../application/useCategoryForm";
import { categoryFormText } from "../content/categories";
import type { AdminCategoryRow } from "../domain/admin-category";
import { CATEGORIES_PATH } from "../domain/categories-query";
import { initialValuesOf } from "../domain/category-form";
import { CategoryDataSection } from "./CategoryDataSection";
import { CategoryFormHeader } from "./CategoryFormHeader";

interface CategoryFormProps {
  /** The category being edited; absent when creating one. */
  category?: AdminCategoryRow;
}

/** The form to create a category or edit one, with what it has on screen and what it sends. */
export const CategoryForm = ({ category }: CategoryFormProps) => {
  const { form, submit, general, isSaving, canSave, changed } = useCategoryForm(
    category
      ? { mode: "edit", categoryId: category.id, initial: initialValuesOf(category) }
      : { mode: "create" },
  );
  const { restore, isPending } = useCategoryActions();
  const { deleted, saveBar } = categoryFormText;
  const deletedAt = category?.deletedAt ?? undefined;
  const editing = category !== undefined;

  let message: string = saveBar.create;
  if (editing) {
    message = changed ? saveBar.dirty : saveBar.clean;
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-6">
        <CategoryFormHeader category={category} />
        {category && deletedAt && (
          <ArchivedNotice
            message={deleted.notice(formatDate(deletedAt))}
            actionLabel={deleted.restore}
            pending={isPending(category.id)}
            onAction={() => void restore(category.id)}
          />
        )}
        <FormAlert message={general} />
        <div
          inert={Boolean(deletedAt)}
          className={cn("flex flex-col gap-5", deletedAt && "opacity-75")}
        >
          <CategoryDataSection categoryId={category?.id} />
        </div>
        {!deletedAt && (
          <FormSaveBar
            message={message}
            changed={changed}
            canSave={canSave}
            saving={isSaving}
            submitLabel={editing ? saveBar.saveLabel : saveBar.createLabel}
            savingLabel={saveBar.saving}
            cancelLabel={saveBar.cancel}
            leaveHref={CATEGORIES_PATH}
            leave={saveBar.leave}
          />
        )}
      </form>
    </FormProvider>
  );
};
