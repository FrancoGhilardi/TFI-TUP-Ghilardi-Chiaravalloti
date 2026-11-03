import Link from "next/link";

import { whenPlainClick } from "@/modules/core/lib/events";

import { categoryHref } from "../domain/catalog-query";
import type { CategorySummary } from "../domain/search-term";
import { searchRowStyles } from "./searchResultStyles";

interface SearchCategoryItemProps {
  category: CategorySummary;
  onNavigate: () => void;
}

export const SearchCategoryItem = ({ category, onNavigate }: SearchCategoryItemProps) => {
  return (
    <Link
      href={categoryHref(category.slug)}
      onClick={whenPlainClick(onNavigate)}
      className={searchRowStyles}
    >
      {category.name}
    </Link>
  );
};
