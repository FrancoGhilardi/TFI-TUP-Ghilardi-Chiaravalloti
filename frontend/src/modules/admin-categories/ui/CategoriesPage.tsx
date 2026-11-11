"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { Button } from "@/modules/core/ui/primitives/button";

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
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-1.5 text-[1.9rem] font-semibold">{title}</h1>
          <p className="mt-1 max-w-[60ch] text-ink-soft">{lead}</p>
        </div>
        <Button asChild>
          <Link href={`${CATEGORIES_PATH}/nueva`}>
            <Plus aria-hidden="true" />
            {newCategory}
          </Link>
        </Button>
      </header>
      <section
        aria-label={title}
        className="rounded-card border border-line-soft bg-surface shadow-sm"
      >
        <CategoriesToolbar query={query} go={go} />
        <CategoriesResults query={query} go={go} />
      </section>
    </div>
  );
};
