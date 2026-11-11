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

/** A table from the medium width; below it every row is a card with the same information. */
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
  const head = "px-3 py-3 font-semibold text-ink-soft";

  return (
    <table className="w-full text-sm max-md:block">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-md:sr-only">
        <tr className="text-xs tracking-wide uppercase">
          <th scope="col" className={`${head} text-left`}>
            {columns.category}
          </th>
          <th scope="col" className={`${head} text-left`}>
            {columns.location}
          </th>
          <th scope="col" className={`${head} text-right`}>
            {columns.products}
          </th>
          <th scope="col" className={`${head} text-right`}>
            {columns.order}
          </th>
          <th scope="col" className={`${head} text-left`}>
            {columns.state}
          </th>
          <th scope="col" className={`${head} text-left`}>
            {columns.modified}
          </th>
          <th scope="col" className="px-3 py-3">
            <span className="sr-only">{columns.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody className="max-md:block max-md:space-y-3 max-md:p-3">
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
      </tbody>
    </table>
  );
};
