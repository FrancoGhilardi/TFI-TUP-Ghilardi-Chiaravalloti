import Link from "next/link";

import type { CategoryNode } from "../domain/category";
import { categoryHref } from "../domain/product-routes";
import { CategoryIcon } from "./CategoryIcon";

interface CategoryTileProps {
  category: CategoryNode;
}

export const CategoryTile = ({ category }: CategoryTileProps) => {
  return (
    <Link
      href={categoryHref(category.slug)}
      className="flex h-full flex-col items-center gap-2.5 rounded-xl border border-line-soft bg-surface px-3.5 py-5 text-center text-[0.92rem] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-teal hover:shadow-soft"
    >
      <CategoryIcon slug={category.slug} className="size-8 text-teal" />
      {category.name}
    </Link>
  );
};
