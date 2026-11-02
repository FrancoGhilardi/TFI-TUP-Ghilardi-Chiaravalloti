import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/modules/core/lib/utils";

import { paginationItems } from "../lib/pagination";
import { paginationItemStyles } from "./pagination-styles";
import { PaginationStep } from "./PaginationStep";

interface PaginationProps {
  current: number;
  total: number;
  /** URL of a page, keeping whatever else the list depends on. */
  hrefFor: (page: number) => string;
}

/** Page links for a list; nothing at all when everything fits in one page. */
export const Pagination = ({ current, total, hrefFor }: PaginationProps) => {
  const items = paginationItems(current, total);
  if (items.length === 0) {
    return null;
  }
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-1">
      <PaginationStep page={current > 1 ? current - 1 : undefined} hrefFor={hrefFor}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anterior
      </PaginationStep>
      <ul className="flex flex-wrap items-center gap-1">
        {items.map((item) =>
          item.type === "gap" ? (
            <li key={item.key} aria-hidden="true" className="px-1 text-ink-soft">
              …
            </li>
          ) : (
            <li key={item.page}>
              <Link
                href={hrefFor(item.page)}
                aria-label={`Página ${item.page}`}
                aria-current={item.page === current ? "page" : undefined}
                className={cn(
                  paginationItemStyles,
                  item.page === current ? "bg-teal text-white" : "text-ink hover:bg-wheat",
                )}
              >
                {item.page}
              </Link>
            </li>
          ),
        )}
      </ul>
      <PaginationStep page={current < total ? current + 1 : undefined} hrefFor={hrefFor}>
        Siguiente
        <ChevronRight className="size-4" aria-hidden="true" />
      </PaginationStep>
    </nav>
  );
};
