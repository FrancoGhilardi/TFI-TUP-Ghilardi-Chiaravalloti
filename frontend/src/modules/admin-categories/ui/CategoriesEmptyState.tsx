import { Tag } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { categoriesContent } from "../content/categories";
import { CATEGORIES_PATH } from "../domain/categories-query";

interface CategoriesEmptyStateProps {
  /** Something narrows the list, so a different search or no filters may bring categories. */
  filtered: boolean;
  onClear: () => void;
}

export const CategoriesEmptyState = ({ filtered, onClear }: CategoriesEmptyStateProps) => {
  const { empty, clear, newCategory } = categoriesContent;
  return (
    <div className="p-4">
      <StatusMessage
        icon={Tag}
        title={filtered ? empty.filteredTitle : empty.noneTitle}
        description={filtered ? empty.filteredText : empty.noneText}
        actions={
          filtered ? (
            <Button type="button" variant="outline" onClick={onClear}>
              {clear}
            </Button>
          ) : (
            <Button asChild>
              <Link href={`${CATEGORIES_PATH}/nueva`}>{newCategory}</Link>
            </Button>
          )
        }
      />
    </div>
  );
};
