import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

import { paginationItemStyles } from "./pagination-styles";

interface PaginationStepProps {
  /** Page to go to, or `undefined` at the ends of the list. */
  page: number | undefined;
  hrefFor: (page: number) => string;
  children: ReactNode;
}

/** "Anterior" / "Siguiente": a link while there is a page to go to, plain text at the ends. */
export const PaginationStep = ({ page, hrefFor, children }: PaginationStepProps) => {
  return page === undefined ? (
    <span className={cn(paginationItemStyles, "text-ink-soft opacity-50")}>{children}</span>
  ) : (
    <Link href={hrefFor(page)} className={cn(paginationItemStyles, "text-ink hover:bg-wheat")}>
      {children}
    </Link>
  );
};
