import Link from "next/link";

import { formatDateTime } from "@/modules/core/formatters/date-time";
import { formatRelativeTime } from "@/modules/core/formatters/relative-time";
import { cn } from "@/modules/core/lib/utils";

import { categoriesContent } from "../content/categories";
import type { AdminCategoryRow } from "../domain/admin-category";
import { CATEGORIES_PATH } from "../domain/categories-query";
import { categoryState } from "../domain/category-state";
import { CategoryRowActions } from "./CategoryRowActions";
import { CategoryStateBadge } from "./CategoryStateBadge";

const CELL =
  "px-3 py-3 align-middle max-md:flex max-md:items-center max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:before:text-xs max-md:before:font-semibold max-md:before:text-ink-soft max-md:before:content-[attr(data-label)]";

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
    <tr
      className={cn(
        "border-t border-line-soft max-md:block max-md:rounded-card max-md:border max-md:p-4",
        state === "deleted" && "bg-wheat/40 text-ink-soft",
      )}
    >
      <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pt-0">
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
      </td>
      <td data-label={columns.location} className={CELL}>
        {category.parent ? (
          <span className="text-ink-soft">{category.parent.name}</span>
        ) : (
          <span className="rounded-full bg-wheat px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
            {root}
          </span>
        )}
      </td>
      <td data-label={columns.products} className={cn(CELL, "md:text-right md:tabular-nums")}>
        {category.productCount}
      </td>
      <td data-label={columns.order} className={cn(CELL, "md:text-right md:tabular-nums")}>
        {category.sortOrder}
      </td>
      <td data-label={columns.state} className={CELL}>
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
      </td>
      <td data-label={columns.modified} className={CELL}>
        <time
          dateTime={category.updatedAt.toISOString()}
          title={formatDateTime(category.updatedAt)}
          className="text-xs"
        >
          {formatRelativeTime(category.updatedAt, readAt)}
        </time>
      </td>
      <td className="px-3 py-3 align-middle max-md:block max-md:px-0 max-md:pb-0">
        <CategoryRowActions
          category={category}
          pending={pending}
          onRemove={onRemove}
          onRestore={onRestore}
        />
      </td>
    </tr>
  );
};
