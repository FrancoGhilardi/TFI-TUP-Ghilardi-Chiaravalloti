import Link from "next/link";

import { formatDateTime } from "@/modules/core/formatters/date-time";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";
import { ListRow } from "@/modules/core/ui/ListRow";
import { RowActionsCell } from "@/modules/core/ui/RowActionsCell";
import { RowCell } from "@/modules/core/ui/RowCell";
import { RowLeadCell } from "@/modules/core/ui/RowLeadCell";

import { categoriesContent } from "../content/categories";
import type { AdminCategoryRow } from "../domain/admin-category";
import { CATEGORIES_PATH } from "../domain/categories-query";
import { categoryState } from "../domain/category-state";
import { CategoryRowActions } from "./CategoryRowActions";
import { CategoryStateBadge } from "./CategoryStateBadge";

/** Width of one level of the tree. */
const INDENT_PX = 22;

interface CategoryRowProps {
  category: AdminCategoryRow;
  /** The list follows the tree: each category is indented by its level. */
  indented: boolean;
  /** A category above it is inactive, so the store hides it. */
  hidden: boolean;
  /** The moment the list was read, to say how long ago each category changed. */
  readAt: Date;
  pending: boolean;
  onRemove: () => void;
  onRestore: () => void;
}

export const CategoryRow = ({
  category,
  indented,
  hidden,
  readAt,
  pending,
  onRemove,
  onRestore,
}: CategoryRowProps) => {
  const { columns, root, hidden: hiddenLabel, hiddenHint } = categoriesContent.table;
  const state = categoryState(category);
  const level = indented ? category.depth : 0;

  return (
    <ListRow deleted={state === "deleted"}>
      <RowLeadCell>
        <div className="flex items-center gap-1.5" style={{ paddingLeft: level * INDENT_PX }}>
          {level > 0 && (
            <span aria-hidden="true" className="text-ink-soft">
              └
            </span>
          )}
          <div className="min-w-0">
            {state === "deleted" ? (
              <span className="block truncate font-semibold">{category.name}</span>
            ) : (
              <Link
                href={`${CATEGORIES_PATH}/${category.id}`}
                className="block truncate font-semibold text-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                {category.name}
              </Link>
            )}
            <span className="block truncate font-mono text-xs text-ink-soft">/{category.slug}</span>
          </div>
        </div>
      </RowLeadCell>
      <RowCell label={columns.location}>
        {category.parent ? (
          <span className="text-ink-soft">{category.parent.name}</span>
        ) : (
          <span className="rounded-full bg-wheat px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
            {root}
          </span>
        )}
      </RowCell>
      <RowCell label={columns.products} numeric>
        {category.productCount}
      </RowCell>
      <RowCell label={columns.order} numeric>
        {category.sortOrder}
      </RowCell>
      <RowCell label={columns.state}>
        <span className="flex flex-wrap items-center gap-1.5">
          <CategoryStateBadge state={state} />
          {hidden && state === "active" && (
            <span
              title={hiddenHint}
              className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-deep"
            >
              {hiddenLabel}
            </span>
          )}
        </span>
      </RowCell>
      <RowCell label={columns.modified}>
        <time
          dateTime={category.updatedAt.toISOString()}
          title={formatDateTime(category.updatedAt)}
          className="text-xs"
        >
          {formatRelativeTime(category.updatedAt, readAt)}
        </time>
      </RowCell>
      <RowActionsCell>
        <CategoryRowActions
          category={category}
          pending={pending}
          onRemove={onRemove}
          onRestore={onRestore}
        />
      </RowActionsCell>
    </ListRow>
  );
};
