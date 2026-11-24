"use client";

import { ListPage } from "@/modules/core/ui/ListPage";

import { useCategoriesQuery } from "../application/useCategoriesQuery";
import { categoriesContent } from "../content/categories";
import { CATEGORIES_PATH } from "../domain/categories-query";
import { CategoriesResults } from "./CategoriesResults";
import { CategoriesToolbar } from "./CategoriesToolbar";

/** The panel's list of categories: the tree, search, filters and the logical delete. */
export const CategoriesPage = () => {
  const { query, go } = useCategoriesQuery();
  const { eyebrow, title, lead, newCategory } = categoriesContent;

  return (
    <ListPage
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      create={{ label: newCategory, href: `${CATEGORIES_PATH}/nueva` }}
    >
      <CategoriesToolbar query={query} go={go} />
      <CategoriesResults query={query} go={go} />
    </ListPage>
  );
};
