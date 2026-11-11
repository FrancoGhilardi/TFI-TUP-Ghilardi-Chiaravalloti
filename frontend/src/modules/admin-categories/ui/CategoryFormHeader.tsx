import { ArrowLeft, Archive } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";

import { useCategoryActions } from "../application/useCategoryActions";
import { categoriesContent, categoryFormText } from "../content/categories";
import type { AdminCategoryRow } from "../domain/admin-category";
import { CATEGORIES_PATH } from "../domain/categories-query";
import { categoryState } from "../domain/category-state";
import { CategoryStateBadge } from "./CategoryStateBadge";

interface CategoryFormHeaderProps {
  /** Absent when creating. */
  category?: AdminCategoryRow;
}

export const CategoryFormHeader = ({ category }: CategoryFormHeaderProps) => {
  const { remove, isPending } = useCategoryActions();
  const { back, newTitle, newLead, remove: removeLabel, productCount } = categoryFormText;
  const state = category ? categoryState(category) : undefined;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link
          href={CATEGORIES_PATH}
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-teal outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back}
        </Link>
        <Eyebrow className="mt-3">{categoriesContent.eyebrow}</Eyebrow>
        <h1 className="mt-1 text-[1.9rem] font-semibold">{category?.name ?? newTitle}</h1>
        {category && state ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className="font-mono">/{category.slug}</span>
            <span aria-hidden="true">·</span>
            <span>{productCount(category.productCount)}</span>
            <CategoryStateBadge state={state} />
          </p>
        ) : (
          <p className="mt-1 max-w-[60ch] text-ink-soft">{newLead}</p>
        )}
      </div>
      {category && state !== "deleted" && (
        <ConfirmDialog
          title={categoriesContent.confirmRemove.title(category.name)}
          description={categoriesContent.confirmRemove.description}
          confirmLabel={categoriesContent.confirmRemove.confirm}
          onConfirm={() => void remove(category.id)}
          disabled={isPending(category.id)}
        >
          <Button type="button" variant="outline" disabled={isPending(category.id)}>
            <Archive aria-hidden="true" />
            {removeLabel}
          </Button>
        </ConfirmDialog>
      )}
    </header>
  );
};
