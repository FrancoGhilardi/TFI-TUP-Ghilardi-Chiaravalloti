import { ListFooter } from "@/modules/core/ui/ListFooter";
import { LoadErrorState } from "@/modules/core/ui/LoadErrorState";
import { OutOfRangeState } from "@/modules/core/ui/OutOfRangeState";
import { TableSkeleton } from "@/modules/core/ui/TableSkeleton";

import { useAdminCategories } from "../application/useAdminCategories";
import { useCategoryActions } from "../application/useCategoryActions";
import { useCategoryOptions } from "../application/useCategoryOptions";
import { categoriesContent } from "../content/categories";
import {
  CATEGORIES_PAGE_SIZE,
  type CategoriesQuery,
  categoriesHref,
  clearedFilters,
  isFiltered,
  isTreeMode,
} from "../domain/categories-query";
import { hiddenIds } from "../domain/category-tree";
import { CategoriesEmptyState } from "./CategoriesEmptyState";
import { CategoriesTable } from "./CategoriesTable";

interface CategoriesResultsProps {
  query: CategoriesQuery;
  go: (changes: Partial<CategoriesQuery>) => void;
}

/** What the query finds, or why it shows nothing: still loading, failed, past the end, or empty. */
export const CategoriesResults = ({ query, go }: CategoriesResultsProps) => {
  const list = useAdminCategories(query);
  const options = useCategoryOptions();
  const { remove, restore, isPending } = useCategoryActions();

  if (list.isPending) {
    return <TableSkeleton label={categoriesContent.loading} />;
  }
  // A refresh that fails keeps showing the last page; only having nothing to show is an error.
  if (!list.data) {
    return (
      <LoadErrorState {...categoriesContent.error} onRetry={() => void list.refetch()} framed />
    );
  }

  const { items, total } = list.data;
  if (items.length === 0) {
    return query.page > 1 ? (
      <OutOfRangeState
        {...categoriesContent.outOfRange}
        firstPageHref={categoriesHref(query, { page: 1 })}
      />
    ) : (
      <CategoriesEmptyState filtered={isFiltered(query)} onClear={() => go(clearedFilters())} />
    );
  }

  return (
    // While the next page loads, the last one stays as a reference but cannot be acted on: it is not
    // what the filters and the page on screen now describe.
    <div
      aria-busy={list.isFetching}
      inert={list.isPlaceholderData}
      className={list.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}
    >
      <div className="overflow-x-auto md:overflow-visible">
        <CategoriesTable
          categories={items}
          indented={isTreeMode(query)}
          hiddenIds={options.data ? hiddenIds(options.data) : new Set()}
          readAt={new Date(list.dataUpdatedAt)}
          isPending={isPending}
          onRemove={(id) => void remove(id)}
          onRestore={(id) => void restore(id)}
        />
      </div>
      <ListFooter
        page={query.page}
        pageSize={CATEGORIES_PAGE_SIZE}
        shown={items.length}
        total={total}
        summary={categoriesContent.table.summary}
        hrefFor={(page) => categoriesHref(query, { page })}
        stale={list.isPlaceholderData}
      />
    </div>
  );
};
