import { ActionsHeaderCell } from "@/modules/core/ui/ActionsHeaderCell";
import { HeaderCell } from "@/modules/core/ui/HeaderCell";
import { ListTable } from "@/modules/core/ui/ListTable";

import { categoriesContent } from "../content/categories";
import type { AdminCategoryRow } from "../domain/admin-category";
import { CategoryRow } from "./CategoryRow";

interface CategoriesTableProps {
  categories: AdminCategoryRow[];
  /** The list follows the tree: each category is indented by its level. */
  indented: boolean;
  /** Ids of the categories that a category above them hides. */
  hiddenIds: ReadonlySet<string>;
  readAt: Date;
  isPending: (id: string) => boolean;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
}

export const CategoriesTable = ({
  categories,
  indented,
  hiddenIds,
  readAt,
  isPending,
  onRemove,
  onRestore,
}: CategoriesTableProps) => {
  const { caption, columns } = categoriesContent.table;

  return (
    <ListTable
      caption={caption}
      head={
        <>
          <HeaderCell>{columns.category}</HeaderCell>
          <HeaderCell>{columns.location}</HeaderCell>
          <HeaderCell numeric>{columns.products}</HeaderCell>
          <HeaderCell numeric>{columns.order}</HeaderCell>
          <HeaderCell>{columns.state}</HeaderCell>
          <HeaderCell>{columns.modified}</HeaderCell>
          <ActionsHeaderCell label={columns.actions} />
        </>
      }
    >
      {categories.map((category) => (
        <CategoryRow
          key={category.id}
          category={category}
          indented={indented}
          hidden={hiddenIds.has(category.id)}
          readAt={readAt}
          pending={isPending(category.id)}
          onRemove={() => onRemove(category.id)}
          onRestore={() => onRestore(category.id)}
        />
      ))}
    </ListTable>
  );
};
