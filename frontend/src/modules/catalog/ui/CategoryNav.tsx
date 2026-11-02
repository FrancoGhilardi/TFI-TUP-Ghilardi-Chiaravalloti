import { ChevronDown } from "lucide-react";

import { catalogContent } from "../content/catalog";
import { catalogHref, type CatalogQuery } from "../domain/catalog-query";
import type { CategoryNode } from "../domain/category";
import { categoryNavItems } from "../domain/category-nav";
import { findCategoryPath } from "../domain/category-tree";
import { CategoryNavLink } from "./CategoryNavLink";
import { CategoryTreeItem } from "./CategoryTreeItem";

interface CategoryNavProps {
  tree: CategoryNode[];
  query: CatalogQuery;
}

// Where the browser lets `::details-content` be styled, wide screens keep the panel always open
// and drop its toggle; elsewhere it stays collapsible, as on phones.
const ALWAYS_OPEN_ON_WIDE =
  "nav:[&::details-content]:block nav:[&::details-content]:[content-visibility:visible]";
const TOGGLE_ONLY_ON_NARROW = "nav:supports-[selector(::details-content)]:hidden";

/**
 * "Todos" and the whole category tree, each subcategory nested under its parent behind a toggle;
 * the branch of the selected category starts open. On phones the tree folds into a panel that
 * shows the current category. Every entry is a link that keeps the search, filters and sort.
 */
export const CategoryNav = ({ tree, query }: CategoryNavProps) => {
  const { label, all } = catalogContent.categories;
  const selected = query.category ? findCategoryPath(tree, query.category)?.selected : undefined;

  return (
    <nav aria-label={label} className="rounded-card border border-line-soft bg-surface p-2 nav:p-4">
      {/* Remounted on every category change, so the panel closes after picking one. */}
      <details key={query.category ?? ""} className={`group ${ALWAYS_OPEN_ON_WIDE}`}>
        <summary
          className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden ${TOGGLE_ONLY_ON_NARROW}`}
        >
          <span>
            {label}: <span className="text-teal">{selected?.name ?? all}</span>
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 text-ink-soft transition-transform group-open:rotate-180"
          />
        </summary>
        <p className="mb-2 hidden px-3 text-[0.72rem] font-bold tracking-[0.16em] text-ink-soft uppercase nav:supports-[selector(::details-content)]:block">
          {label}
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 nav:mt-0">
          <li>
            <CategoryNavLink
              href={catalogHref(query, { category: undefined })}
              label={all}
              active={!query.category}
            />
          </li>
          {categoryNavItems(tree, query).map((item) => (
            <CategoryTreeItem key={item.id} item={item} />
          ))}
        </ul>
      </details>
    </nav>
  );
};
