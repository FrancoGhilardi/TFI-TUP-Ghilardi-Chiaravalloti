import { Archive, Pencil, RotateCcw } from "lucide-react";

import { ConfirmRowAction } from "@/modules/core/ui/ConfirmRowAction";
import { RowActionButton } from "@/modules/core/ui/RowActionButton";
import { RowActionLink } from "@/modules/core/ui/RowActionLink";
import { RowActions } from "@/modules/core/ui/RowActions";

import { categoriesContent } from "../content/categories";
import type { AdminCategoryRow } from "../domain/admin-category";
import { CATEGORIES_PATH } from "../domain/categories-query";
import { categoryState } from "../domain/category-state";

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
  const { name } = category;

  if (categoryState(category) === "deleted") {
    return (
      <RowActions>
        <RowActionButton
          icon={RotateCcw}
          label={actions.restore(name)}
          disabled={pending}
          onClick={onRestore}
        />
      </RowActions>
    );
  }
  return (
    <RowActions>
      <RowActionLink
        icon={Pencil}
        label={actions.edit(name)}
        href={`${CATEGORIES_PATH}/${category.id}`}
      />
      <ConfirmRowAction
        icon={Archive}
        label={actions.remove(name)}
        dialog={{ ...confirmRemove, title: confirmRemove.title(name) }}
        onConfirm={onRemove}
        pending={pending}
      />
    </RowActions>
  );
};
