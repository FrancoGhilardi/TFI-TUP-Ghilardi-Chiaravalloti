import { ListEmptyState } from "@/modules/core/ui/ListEmptyState";
import { ListResults } from "@/modules/core/ui/ListResults";
import { Tag } from "lucide-react";

import { useAdminCategories } from "../application/useAdminCategories";
import { useCategoryActions } from "../application/useCategoryActions";
import { categoriesContent } from "../content/categories";
import {
  clearedFilters,
  isFiltered,
  isTreeMode,
  CATEGORIES_PAGE_SIZE,
  CATEGORIES_PATH,
  type CategoriesQuery,
  categoriesHref,
} from "../domain/categories-query";
import { hiddenIds } from "../domain/category-tree";
import { useCategoryOptions } from "../application/useCategoryOptions";
import { CategoriesTable } from "./CategoriesTable";

interface CategoriesResultsProps {
  query: CategoriesQuery;
  go: (changes: Partial<CategoriesQuery>) => void;
}

/** What the query finds, or why it shows nothing: still loading, failed, past the end, or empty. */
export const CategoriesResults = ({ query, go }: CategoriesResultsProps) => {
  const list = useAdminCategories(query);
  const { remove, restore, isPending } = useCategoryActions();
  const options = useCategoryOptions();
  const { empty, clear, newCategory, table } = categoriesContent;

  return (
    <ListResults
      list={list}
      page={query.page}
      pageSize={CATEGORIES_PAGE_SIZE}
      firstPageHref={categoriesHref(query, { page: 1 })}
      hrefFor={(page) => categoriesHref(query, { page })}
      text={{ ...categoriesContent, summary: table.summary }}
      empty={
        <ListEmptyState
          icon={Tag}
          filtered={isFiltered(query)}
          onClear={() => go(clearedFilters())}
          text={{ ...empty, clear }}
          create={{ label: newCategory, href: `${CATEGORIES_PATH}/nueva` }}
        />
      }
    >
      {(items, readAt) => (
        <CategoriesTable
          categories={items}
          indented={isTreeMode(query)}
          hiddenIds={options.data ? hiddenIds(options.data) : new Set()}
          readAt={readAt}
          isPending={isPending}
          onRemove={(id) => void remove(id)}
          onRestore={(id) => void restore(id)}
        />
      )}
    </ListResults>
  );
};
