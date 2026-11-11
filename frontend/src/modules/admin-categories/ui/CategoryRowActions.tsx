import { Archive, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";

import { categoriesContent } from "../content/categories";
import { CATEGORIES_PATH } from "../domain/categories-query";
import type { AdminCategoryRow } from "../domain/admin-category";
import { categoryState } from "../domain/category-state";

const BUTTON =
  "grid size-9 place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50";

interface CategoryRowActionsProps {
  category: AdminCategoryRow;
  /** A request for this category is on its way. */
  pending: boolean;
  onRemove: () => void;
  onRestore: () => void;
}

/** Edit and give a logical delete to a category, or bring a deleted one back. */
export const CategoryRowActions = ({
  category,
  pending,
  onRemove,
  onRestore,
}: CategoryRowActionsProps) => {
  const { actions, confirmRemove } = categoriesContent;
  const deleted = categoryState(category) === "deleted";

  if (deleted) {
    return (
      <span className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label={actions.restore(category.name)}
          title={actions.restore(category.name)}
          disabled={pending}
          onClick={onRestore}
          className={BUTTON}
        >
          <RotateCcw className="size-[18px]" aria-hidden="true" />
        </button>
      </span>
    );
  }
  return (
    <span className="flex items-center justify-end gap-1">
      <Link
        href={`${CATEGORIES_PATH}/${category.id}`}
        aria-label={actions.edit(category.name)}
        title={actions.edit(category.name)}
        className={BUTTON}
      >
        <Pencil className="size-[18px]" aria-hidden="true" />
      </Link>
      <ConfirmDialog
        title={confirmRemove.title(category.name)}
        description={confirmRemove.description}
        confirmLabel={confirmRemove.confirm}
        onConfirm={onRemove}
        disabled={pending}
      >
        <button
          type="button"
          aria-label={actions.remove(category.name)}
          title={actions.remove(category.name)}
          disabled={pending}
          className={BUTTON}
        >
          <Archive className="size-[18px]" aria-hidden="true" />
        </button>
      </ConfirmDialog>
    </span>
  );
};
